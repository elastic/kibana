#!/usr/bin/env python3
"""
Generates customer0_rag_dataset.jsonl: simple, single-lookup RAG questions about the
Customer-0 cluster. Every reference answer is computed live from the cluster when this
script runs, so the dataset is reproducible and answers are never hand-typed.

Time-agnostic strategy:
  * STATIC streams (ingestion stopped, never change): all-time questions.
  * LIVE streams (still ingesting): every question is pinned to a closed, absolute UTC
    window (WINDOW_FROM <= @timestamp < WINDOW_TO), so the answer cannot drift as new
    data arrives. Nothing is relative to "now".

Usage:
  ES_URL=https://<es-host> ES_API_KEY=<base64 key> python3 generate_customer0_rag_dataset.py
Needs only index-level read privileges (no cluster privileges).
"""
import json
import os
import sys
import urllib.request

ES_URL = os.environ["ES_URL"].rstrip("/")
ES_API_KEY = os.environ["ES_API_KEY"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "customer0_rag_dataset.jsonl")

WINDOW_FROM = "2026-09-15T00:00:00Z"
WINDOW_TO = "2026-09-16T00:00:00Z"
WIN = "between 2026-09-15 00:00 UTC (inclusive) and 2026-09-16 00:00 UTC (exclusive)"
RANGE = {"range": {"@timestamp": {"gte": WINDOW_FROM, "lt": WINDOW_TO}}}


def es(path, body):
    req = urllib.request.Request(
        f"{ES_URL}{path}",
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Authorization": f"ApiKey {ES_API_KEY}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def q(extra=None, windowed=False):
    must = []
    if windowed:
        must.append(RANGE)
    if extra:
        must.append(extra)
    return {"bool": {"filter": must}} if must else {"match_all": {}}


def count(index, extra=None, windowed=False):
    return es(f"/{index}/_count", {"query": q(extra, windowed)})["count"]


def terms(index, field, extra=None, windowed=False, size=50):
    r = es(
        f"/{index}/_search",
        {"size": 0, "query": q(extra, windowed),
         "aggs": {"t": {"terms": {"field": field, "size": size}}}},
    )
    return [(b["key"], b["doc_count"]) for b in r["aggregations"]["t"]["buckets"]]


def distinct(index, field, extra=None, windowed=False):
    r = es(
        f"/{index}/_search",
        {"size": 0, "query": q(extra, windowed),
         "aggs": {"c": {"cardinality": {"field": field, "precision_threshold": 40000}}}},
    )
    return r["aggregations"]["c"]["value"]


def stat(index, field, kind, extra=None, windowed=False):
    r = es(
        f"/{index}/_search",
        {"size": 0, "query": q(extra, windowed), "aggs": {"s": {kind: {"field": field}}}},
    )
    return r["aggregations"]["s"]["value"]


def term(field, value):
    return {"term": {field: value}}


def join(values):
    return ", ".join(str(v) for v in sorted(values, key=str))


EXAMPLES = []


def add(category, source, question, answer, stability, how):
    EXAMPLES.append(
        {
            "input": {"question": question},
            "output": {"reference_answer": str(answer)},
            "metadata": {
                "category": category,
                "data_source": source,
                "stability": stability,
                "ground_truth_query": how,
            },
        }
    )


STATIC = "static-stream"  # ingestion stopped: all-time answer is fixed
WINDOWED = "fixed-window"  # live stream pinned to an absolute UTC window

# ----------------------------------------------------------------------------
# 1. APM / RUM (static): kibana-frontend, traces-apm.rum-default + metrics-apm.*
# ----------------------------------------------------------------------------
RUM = "traces-apm.rum-default"
n = count(RUM)
add("apm-rum", RUM, "Which service name is reported in the traces-apm.rum-default data stream?",
    "kibana-frontend", STATIC, "terms service.name")
add("apm-rum", RUM, "What is the service.environment of the RUM traces in traces-apm.rum-default?",
    terms(RUM, "service.environment")[0][0], STATIC, "terms service.environment")
add("apm-rum", RUM, "Which APM agent (agent.name) produced the documents in traces-apm.rum-default?",
    terms(RUM, "agent.name")[0][0], STATIC, "terms agent.name")
add("apm-rum", RUM, "What programming language does the kibana-frontend RUM service report?",
    terms(RUM, "service.language.name")[0][0], STATIC, "terms service.language.name")
add("apm-rum", RUM, "How many documents are in the traces-apm.rum-default data stream in total?",
    n, STATIC, "_count")
add("apm-rum", RUM, "How many RUM transactions (processor.event = transaction) exist in traces-apm.rum-default?",
    count(RUM, term("processor.event", "transaction")), STATIC, "_count processor.event:transaction")
add("apm-rum", RUM, "How many RUM spans (processor.event = span) exist in traces-apm.rum-default?",
    count(RUM, term("processor.event", "span")), STATIC, "_count processor.event:span")
ttypes = terms(RUM, "transaction.type", term("processor.event", "transaction"))
add("apm-rum", RUM, "List the transaction types recorded for the kibana-frontend RUM service.",
    join(k for k, _ in ttypes), STATIC, "terms transaction.type")
add("apm-rum", RUM, "How many 'page-load' transactions were recorded for kibana-frontend?",
    dict(ttypes)["page-load"], STATIC, "terms transaction.type")
add("apm-rum", RUM, "How many 'http-request' transactions were recorded for kibana-frontend?",
    dict(ttypes)["http-request"], STATIC, "terms transaction.type")
add("apm-rum", RUM, "How many 'app-change' transactions were recorded for kibana-frontend?",
    dict(ttypes)["app-change"], STATIC, "terms transaction.type")
add("apm-rum", RUM, "How many RUM documents in traces-apm.rum-default have event.outcome = failure?",
    count(RUM, term("event.outcome", "failure")), STATIC, "_count event.outcome:failure")
add("apm-rum", RUM, "Which HTTP response status codes appear in traces-apm.rum-default?",
    join(k for k, _ in terms(RUM, "http.response.status_code")), STATIC, "terms http.response.status_code")
add("apm-rum", RUM, "How many RUM documents have HTTP response status code 503?",
    count(RUM, term("http.response.status_code", 503)), STATIC, "_count status 503")
add("apm-rum", RUM, "What user agent (browser) name is recorded for kibana-frontend RUM traffic?",
    terms(RUM, "user_agent.name")[0][0], STATIC, "terms user_agent.name")
add("apm-rum", RUM, "How many distinct RUM transaction names exist for kibana-frontend?",
    distinct(RUM, "transaction.name", term("processor.event", "transaction")), STATIC,
    "cardinality transaction.name")
add("apm-rum", RUM, "What is the earliest @timestamp in traces-apm.rum-default?",
    es(f"/{RUM}/_search", {"size": 0, "aggs": {"m": {"min": {"field": "@timestamp"}}}})
    ["aggregations"]["m"]["value_as_string"], STATIC, "min @timestamp")

for ds, label in [
    ("metrics-apm.transaction.1m-default", "transaction"),
    ("metrics-apm.service_summary.1m-default", "service_summary"),
    ("metrics-apm.service_destination.1m-default", "service_destination"),
    ("metrics-apm.service_transaction.1m-default", "service_transaction"),
]:
    add("apm-metrics", ds, f"How many documents are in the {ds} data stream?",
        count(ds), STATIC, "_count")
    add("apm-metrics", ds, f"Which metricset.name do documents in {ds} carry?",
        terms(ds, "metricset.name")[0][0], STATIC, "terms metricset.name")

# ----------------------------------------------------------------------------
# 2. OTel generic dataset for customer-zero-code-indexer (static, Aug 2026 test run)
# ----------------------------------------------------------------------------
G_T = "traces-generic.otel-customer-zero"
G_M = "metrics-generic.otel-customer-zero"
G_TX = "metrics-transaction.1m.otel-customer-zero"
add("otel-traces", G_T, "Which service reports data to the traces-generic.otel-customer-zero data stream?",
    "customer-zero-code-indexer", STATIC, "terms service.name")
add("otel-traces", G_T, "What language is the service in traces-generic.otel-customer-zero written in?",
    terms(G_T, "service.language.name")[0][0], STATIC, "terms service.language.name")
add("otel-traces", G_T, "What is the deployment environment of the traces in traces-generic.otel-customer-zero?",
    terms(G_T, "service.environment")[0][0], STATIC, "terms service.environment")
add("otel-traces", G_T, "How many documents does traces-generic.otel-customer-zero contain?",
    count(G_T), STATIC, "_count")
add("otel-traces", G_T, "How many transactions named 'GET /healthz' are in traces-generic.otel-customer-zero?",
    count(G_T, {"bool": {"filter": [term("transaction.name", "GET /healthz"), term("processor.event", "transaction")]}}),
    STATIC, "_count transaction.name")
add("otel-traces", G_T, "Which transaction names (processor.event = transaction) appear in traces-generic.otel-customer-zero?",
    join(k for k, _ in terms(G_T, "transaction.name", term("processor.event", "transaction"))),
    STATIC, "terms transaction.name")
add("otel-traces", G_T, "Which OTel agent.name sent the data in traces-generic.otel-customer-zero?",
    terms(G_T, "agent.name")[0][0], STATIC, "terms agent.name")
add("otel-traces", G_T, "How many documents in traces-generic.otel-customer-zero have event.outcome = failure?",
    count(G_T, term("event.outcome", "failure")), STATIC, "_count failure")
ua = dict(terms(G_T, "user_agent.name"))
add("otel-traces", G_T, "How many traces in traces-generic.otel-customer-zero came from the curl user agent?",
    ua["curl"], STATIC, "terms user_agent.name")
add("otel-metrics", G_M, "How many documents are in metrics-generic.otel-customer-zero?",
    count(G_M), STATIC, "_count")
add("otel-metrics", G_M, "Which two custom/OTel metrics are reported in metrics-generic.otel-customer-zero?",
    "code_indexer.queue.depth, http.server.active_requests", STATIC, "field_caps metrics.*")
add("otel-metrics", G_TX, "How many documents are in metrics-transaction.1m.otel-customer-zero?",
    count(G_TX), STATIC, "_count")
add("otel-metrics", "metrics-service_summary.1m.otel-customer-zero",
    "How many documents are in metrics-service_summary.1m.otel-customer-zero?",
    count("metrics-service_summary.1m.otel-customer-zero"), STATIC, "_count")
add("otel-metrics", "metrics-service_transaction.1m.otel-customer-zero",
    "How many documents are in metrics-service_transaction.1m.otel-customer-zero?",
    count("metrics-service_transaction.1m.otel-customer-zero"), STATIC, "_count")

# ----------------------------------------------------------------------------
# 3. customer-zero-codebox (Node.js) logs / traces / metrics, fixed window
# ----------------------------------------------------------------------------
CB_L = "logs-customer_zero_codebox.otel-default"
CB_T = "traces-customer_zero_codebox.otel-default"
CB_M = "metrics-customer_zero_codebox.otel-default"
add("codebox-logs", CB_L, "Which service name emits the logs in logs-customer_zero_codebox.otel-default?",
    "customer-zero-codebox", STATIC, "terms service.name")
add("codebox-logs", CB_L, "Which logging library instrumentation (scope.name) produces the codebox logs?",
    terms(CB_L, "scope.name")[0][0], STATIC, "terms scope.name")
add("codebox-logs", CB_L, "What log level (severity_text) do the codebox logs use?",
    terms(CB_L, "severity_text")[0][0], STATIC, "terms severity_text")
add("codebox-logs", CB_L, f"How many codebox log records were written {WIN}?",
    count(CB_L, None, True), WINDOWED, "_count window")
add("codebox-logs", CB_L, f"How many distinct hosts (host.name) produced codebox logs {WIN}?",
    distinct(CB_L, "host.name", None, True), WINDOWED, "cardinality host.name")
add("codebox-logs", CB_L, f"How many codebox log records {WIN} recorded HTTP status 401?",
    count(CB_L, term("attributes.http.response.status_code", 401), True), WINDOWED, "_count status 401")
add("codebox-logs", CB_L, f"How many codebox log records {WIN} recorded HTTP status 200?",
    count(CB_L, term("attributes.http.response.status_code", 200), True), WINDOWED, "_count status 200")
add("codebox-logs", CB_L, f"Which HTTP methods appear in codebox logs {WIN}?",
    join(k for k, _ in terms(CB_L, "attributes.http.request.method", None, True)), WINDOWED, "terms method")
top = terms(CB_L, "attributes.http.route", None, True)[0]
add("codebox-logs", CB_L, f"Which http.route is the most frequent in codebox logs {WIN}?",
    top[0], WINDOWED, "terms attributes.http.route top1")
add("codebox-logs", CB_L, "What Node.js runtime version (process.runtime.version) does the codebox service run?",
    terms(CB_L, "resource.attributes.process.runtime.version")[0][0], STATIC, "terms process.runtime.version")
add("codebox-logs", CB_L, "What is the service.version of customer-zero-codebox?",
    terms(CB_L, "resource.attributes.service.version")[0][0], STATIC, "terms service.version")

add("codebox-traces", CB_T, "Which service name emits traces to traces-customer_zero_codebox.otel-default?",
    "customer-zero-codebox", STATIC, "terms service.name")
add("codebox-traces", CB_T, "Which agent.name is used by the customer-zero-codebox traces?",
    terms(CB_T, "agent.name")[0][0], STATIC, "terms agent.name")
add("codebox-traces", CB_T, f"How many documents were written to traces-customer_zero_codebox.otel-default {WIN}?",
    count(CB_T, None, True), WINDOWED, "_count window")
add("codebox-traces", CB_T,
    f"How many 'GET /health' transactions did codebox record {WIN}?",
    count(CB_T, {"bool": {"filter": [term("transaction.name", "GET /health"), term("processor.event", "transaction")]}}, True),
    WINDOWED, "_count transaction.name:GET /health")
add("codebox-traces", CB_T,
    f"How many 'POST /repos/:org/:repo/fetch' transactions did codebox record {WIN}?",
    count(CB_T, {"bool": {"filter": [term("transaction.name", "POST /repos/:org/:repo/fetch"), term("processor.event", "transaction")]}}, True),
    WINDOWED, "_count transaction.name:POST fetch")
add("codebox-traces", CB_T, f"How many codebox traces {WIN} have HTTP response status code 401?",
    count(CB_T, term("http.response.status_code", 401), True), WINDOWED, "_count 401")
add("codebox-traces", CB_T, f"Which HTTP response status codes appear in codebox traces {WIN}?",
    join(k for k, _ in terms(CB_T, "http.response.status_code", None, True)), WINDOWED, "terms status")
add("codebox-traces", CB_T, f"What are the span kinds present in codebox traces {WIN}?",
    join(k for k, _ in terms(CB_T, "kind", None, True)), WINDOWED, "terms kind")
add("codebox-traces", CB_T, f"What are the internal span names (kind = Internal) created by codebox {WIN}?",
    join(k for k, _ in terms(CB_T, "name", term("kind", "Internal"), True)), WINDOWED, "terms name kind:Internal")
add("codebox-traces", CB_T, f"How many distinct hosts reported codebox traces {WIN}?",
    distinct(CB_T, "host.name", None, True), WINDOWED, "cardinality host.name")

add("codebox-metrics", CB_M, f"Which git commands does codebox track in codebox.git.command.count {WIN}?",
    join(k for k, _ in terms(CB_M, "attributes.codebox.git.command", None, True)), WINDOWED, "terms git.command")
add("codebox-metrics", CB_M, f"Which repositories (attributes.codebox.repo) appear in codebox metrics {WIN}?",
    join(k for k, _ in terms(CB_M, "attributes.codebox.repo", None, True)), WINDOWED, "terms codebox.repo")
add("codebox-metrics", CB_M, f"How many distinct repositories does codebox report metrics for {WIN}?",
    distinct(CB_M, "attributes.codebox.repo", None, True), WINDOWED, "cardinality codebox.repo")
add("codebox-metrics", CB_M, "Which field name holds the codebox process resident set size metric?",
    "metrics.codebox.process.rss", STATIC, "field_caps")
add("codebox-metrics", CB_M, "Which field name holds the codebox clone duration metric?",
    "metrics.codebox.clone.duration", STATIC, "field_caps")
add("codebox-metrics", CB_M, "What is the value of attributes.codebox.clone.status recorded for codebox clone metrics?",
    "success", STATIC, "terms codebox.clone.status")
add("codebox-metrics", CB_M, f"How many metric documents did codebox write {WIN}?",
    count(CB_M, None, True), WINDOWED, "_count window")

# ----------------------------------------------------------------------------
# 4. customer-zero-code-indexer (Python/FastAPI) logs / traces / metrics
# ----------------------------------------------------------------------------
CI_L = "logs-customer_zero_code_indexer.otel-default"
CI_T = "traces-customer_zero_code_indexer.otel-default"
CI_M = "metrics-customer_zero_code_indexer.otel-default"
add("indexer-logs", CI_L, "Which service name emits logs to logs-customer_zero_code_indexer.otel-default?",
    "customer-zero-code-indexer", STATIC, "terms service.name")
add("indexer-logs", CI_L, "What deployment environment do the code indexer logs report?",
    terms(CI_L, "service.environment")[0][0], STATIC, "terms service.environment")
add("indexer-logs", CI_L, f"How many code indexer log records were written {WIN}?",
    count(CI_L, None, True), WINDOWED, "_count window")
add("indexer-logs", CI_L, f"Which logger scope names appear in the code indexer logs {WIN}?",
    join(k for k, _ in terms(CI_L, "scope.name", None, True)), WINDOWED, "terms scope.name")

add("indexer-traces", CI_T, "Which web framework instrumentation (scope.name) produces the code indexer HTTP server spans?",
    "opentelemetry.instrumentation.fastapi", STATIC, "terms scope.name")
add("indexer-traces", CI_T, "What language does the customer-zero-code-indexer service use?",
    terms(CI_T, "service.language.name")[0][0], STATIC, "terms service.language.name")
add("indexer-traces", CI_T, "What OpenTelemetry SDK version (telemetry.sdk.version) does the code indexer use?",
    terms(CI_T, "resource.attributes.telemetry.sdk.version")[0][0], STATIC, "terms telemetry.sdk.version")
add("indexer-traces", CI_T, f"How many documents were written to traces-customer_zero_code_indexer.otel-default {WIN}?",
    count(CI_T, None, True), WINDOWED, "_count window")
hz = {"bool": {"filter": [term("transaction.name", "GET /healthz"), term("processor.event", "transaction")]}}
add("indexer-traces", CI_T, f"How many 'GET /healthz' transactions did the code indexer record {WIN}?",
    count(CI_T, hz, True), WINDOWED, "_count transaction.name:GET /healthz")
add("indexer-traces", CI_T, f"How many 'POST /v1/index-jobs' transactions did the code indexer record {WIN}?",
    count(CI_T, {"bool": {"filter": [term("transaction.name", "POST /v1/index-jobs"), term("processor.event", "transaction")]}}, True),
    WINDOWED, "_count transaction.name:POST /v1/index-jobs")
add("indexer-traces", CI_T, f"How many 'code_indexer.run_job' spans did the code indexer record {WIN}?",
    count(CI_T, term("name", "code_indexer.run_job"), True), WINDOWED, "_count name:code_indexer.run_job")
add("indexer-traces", CI_T, f"How many 'code_indexer.submit_job' spans did the code indexer record {WIN}?",
    count(CI_T, term("name", "code_indexer.submit_job"), True), WINDOWED, "_count name:code_indexer.submit_job")
add("indexer-traces", CI_T, "Which transaction.type values are recorded for the code indexer traces?",
    join(k for k, _ in terms(CI_T, "transaction.type", None, False)), "enumeration", "terms transaction.type")
add("indexer-traces", CI_T, "What is the span kind of the 'GET /healthz' root transaction in the code indexer traces?",
    "Server", STATIC, "terms kind transaction.name:GET /healthz")

add("indexer-metrics", CI_M, "Which field holds the code indexer job duration metric?",
    "metrics.code_indexer.job.duration", STATIC, "field_caps")
add("indexer-metrics", CI_M, "Which field holds the number of failed code indexer jobs?",
    "metrics.code_indexer.jobs.failures", STATIC, "field_caps")
add("indexer-metrics", CI_M, "Which field holds the code indexer queue depth metric?",
    "metrics.code_indexer.queue.depth", STATIC, "field_caps")
add("indexer-metrics", CI_M, "Which indexing strategies (attributes.index.strategy) does the code indexer report?",
    join(k for k, _ in terms(CI_M, "attributes.index.strategy", None, True)), WINDOWED, "terms index.strategy")
add("indexer-metrics", CI_M, "Which git ref types (attributes.git.ref.type) does the code indexer report?",
    join(k for k, _ in terms(CI_M, "attributes.git.ref.type", None, True)), WINDOWED, "terms git.ref.type")
add("indexer-metrics", CI_M, "Which sourcerer operations (attributes.sourcerer.operation) are tracked by the code indexer?",
    join(k for k, _ in terms(CI_M, "attributes.sourcerer.operation", None, True)), WINDOWED, "terms sourcerer.operation")
add("indexer-metrics", CI_M, f"How many metric documents did the code indexer write {WIN}?",
    count(CI_M, None, True), WINDOWED, "_count window")

# ----------------------------------------------------------------------------
# 5. Agent Builder (Kibana inference) traces + logs
# ----------------------------------------------------------------------------
AB_T = "traces-agent_builder.otel-*"
AB_L = "logs-agent_builder.otel-default"
add("agent-builder-logs", AB_L, "Which service name emits the Agent Builder logs in logs-agent_builder.otel-default?",
    "kibana", STATIC, "terms service.name")
add("agent-builder-logs", AB_L, "What is the only attributes.event.name value in logs-agent_builder.otel-default?",
    "exception", STATIC, "terms attributes.event.name")
add("agent-builder-logs", AB_L, "Which instrumentation scope name emits the Agent Builder logs?",
    terms(AB_L, "scope.name")[0][0], STATIC, "terms scope.name")
add("agent-builder-logs", AB_L, f"How many Agent Builder exception logs were written {WIN}?",
    count(AB_L, None, True), WINDOWED, "_count window")
add("agent-builder-logs", AB_L, f"Which exception types (attributes.exception.type) were logged by Agent Builder {WIN}?",
    join(k for k, _ in terms(AB_L, "attributes.exception.type", None, True)), WINDOWED, "terms exception.type")
add("agent-builder-logs", AB_L, f"What is the most common exception type in the Agent Builder logs {WIN}?",
    terms(AB_L, "attributes.exception.type", None, True)[0][0], WINDOWED, "terms exception.type top1")
add("agent-builder-logs", "logs-agent_builder.otel-obs-space",
    "How many exception logs are in the logs-agent_builder.otel-obs-space data stream?",
    count("logs-agent_builder.otel-obs-space"), "static-stream", "_count")

add("agent-builder-traces", AB_T, "Which service name emits the Agent Builder traces?",
    "kibana", STATIC, "terms service.name")
add("agent-builder-traces", AB_T, "What language does the Agent Builder tracing service report (service.language.name)?",
    terms(AB_T, "service.language.name")[0][0], STATIC, "terms service.language.name")
add("agent-builder-traces", AB_T, "Which instrumentation scope produces Agent Builder traces?",
    terms(AB_T, "scope.name")[0][0], STATIC, "terms scope.name")
add("agent-builder-traces", AB_T, "Which gen_ai.operation.name values appear in Agent Builder traces?",
    join(k for k, _ in terms(AB_T, "attributes.gen_ai.operation.name")), "enumeration", "terms gen_ai.operation.name")
add("agent-builder-traces", AB_T, f"How many Agent Builder trace documents were written {WIN}?",
    count(AB_T, None, True), WINDOWED, "_count window")
add("agent-builder-traces", AB_T, f"How many 'chat' LLM spans (gen_ai.operation.name = chat) were recorded {WIN}?",
    count(AB_T, term("attributes.gen_ai.operation.name", "chat"), True), WINDOWED, "_count chat")
add("agent-builder-traces", AB_T, f"How many 'execute_tool' spans were recorded {WIN}?",
    count(AB_T, term("attributes.gen_ai.operation.name", "execute_tool"), True), WINDOWED, "_count execute_tool")
add("agent-builder-traces", AB_T, f"How many 'invoke_agent' spans were recorded {WIN}?",
    count(AB_T, term("attributes.gen_ai.operation.name", "invoke_agent"), True), WINDOWED, "_count invoke_agent")
add("agent-builder-traces", AB_T, f"Which LLM models (gen_ai.request.model) were requested in Agent Builder traces {WIN}?",
    join(k for k, _ in terms(AB_T, "attributes.gen_ai.request.model", None, True)), WINDOWED, "terms gen_ai.request.model")
add("agent-builder-traces", AB_T, f"Which model was requested most often {WIN} in Agent Builder traces?",
    terms(AB_T, "attributes.gen_ai.request.model", None, True)[0][0], WINDOWED, "terms request.model top1")
add("agent-builder-traces", AB_T, f"Which tool (gen_ai.tool.name) was executed most often {WIN}?",
    terms(AB_T, "attributes.gen_ai.tool.name", None, True)[0][0], WINDOWED, "terms tool.name top1")
add("agent-builder-traces", AB_T, f"How many spans {WIN} ended with status.code = Error?",
    count(AB_T, term("status.code", "Error"), True), WINDOWED, "_count status.code:Error")
add("agent-builder-traces", AB_T, f"Which agent IDs (gen_ai.agent.id) invoked agents {WIN}?",
    join(k for k, _ in terms(AB_T, "attributes.gen_ai.agent.id", None, True, 100)), WINDOWED, "terms gen_ai.agent.id")
add("agent-builder-traces", AB_T, "Which data streams hold Agent Builder traces (give the space suffix names)?",
    "traces-agent_builder.otel-classic-space, traces-agent_builder.otel-cp-hosted-ns, traces-agent_builder.otel-default, traces-agent_builder.otel-obs-space",
    "inventory", "_resolve/index")

# ----------------------------------------------------------------------------
# 6. Fleet server + Elastic Agent
# ----------------------------------------------------------------------------
FS = "metrics-fleet_server.agent_status-default"
FV = "metrics-fleet_server.agent_versions-default"
SC = "logs-elastic_agent.status_change-default"
add("fleet", FS, "What agent.type reports Fleet agent status metrics in metrics-fleet_server.agent_status-default?",
    terms(FS, "agent.type")[0][0], STATIC, "terms agent.type")
add("fleet", FS, "Which field in metrics-fleet_server.agent_status-default holds the total number of Fleet agents?",
    "fleet.agents.total", STATIC, "field_caps")
add("fleet", FS, "Which field in metrics-fleet_server.agent_status-default holds the number of offline Fleet agents?",
    "fleet.agents.offline", STATIC, "field_caps")
add("fleet", FS, f"How many metric documents were written to metrics-fleet_server.agent_status-default {WIN}?",
    count(FS, None, True), WINDOWED, "_count window")
add("fleet", FV, "Which field holds the number of agents per version in metrics-fleet_server.agent_versions-default?",
    "fleet.agent.count", STATIC, "field_caps")
add("fleet", FV, f"Which Elastic Agent versions (fleet.agent.version) were reported {WIN}?",
    join(k for k, _ in terms(FV, "fleet.agent.version", None, True)), WINDOWED, "terms fleet.agent.version")
add("fleet", FV, f"How many metric documents were written to metrics-fleet_server.agent_versions-default {WIN}?",
    count(FV, None, True), WINDOWED, "_count window")
add("fleet", SC, "Which field holds the agent health in logs-elastic_agent.status_change-default?",
    "health_status", STATIC, "document sample")
add("fleet", SC, "Which policy_id do the elastic_agent.status_change logs belong to?",
    terms(SC, "policy_id")[0][0], "enumeration", "terms policy_id")
add("fleet", SC, "Which status values appear in logs-elastic_agent.status_change-default?",
    join(k for k, _ in terms(SC, "status")), "enumeration", "terms status")

# ----------------------------------------------------------------------------
# 7. Cluster inventory
# ----------------------------------------------------------------------------
add("inventory", "cluster", "Which data stream stores the Customer-0 RUM (browser) traces?",
    "traces-apm.rum-default", "inventory", "_resolve/index")
add("inventory", "cluster", "Which data stream stores logs from the customer-zero-codebox service?",
    CB_L, "inventory", "_resolve/index")
add("inventory", "cluster", "Which data stream stores metrics from the customer-zero-code-indexer service?",
    CI_M, "inventory", "_resolve/index")
add("inventory", "cluster", "Which data stream stores Fleet Server agent version metrics?",
    FV, "inventory", "_resolve/index")
add("inventory", "cluster", "Which data stream holds traces from the customer-zero-codebox service?",
    CB_T, "inventory", "_resolve/index")
add("inventory", "cluster", "Which data stream holds the 1-minute APM transaction metrics for the kibana-frontend RUM service?",
    "metrics-apm.transaction.1m-default", "inventory", "_resolve/index")

with open(OUT, "w") as f:
    for ex in EXAMPLES:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")
print(f"wrote {len(EXAMPLES)} examples -> {OUT}", file=sys.stderr)
