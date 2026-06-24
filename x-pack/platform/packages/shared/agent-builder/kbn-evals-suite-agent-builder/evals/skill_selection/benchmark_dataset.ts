/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Skill-selection benchmark dataset — 147 examples across 26 skills.
 *
 * Generated from benchmark_dataset.csv (Step 1 of the skill-evals plan).
 * Query types:
 *   direct     — query that explicitly calls for this skill
 *   indirect   — describes the problem without naming the skill domain
 *   distractor — sounds similar to a neighbouring skill but should NOT trigger this one
 *
 * Metadata wiring:
 *   direct/indirect  → expectedSkill = skillId  (the skill must load)
 *   distractor       → shouldNotActivateSkill = skillId  (the skill must NOT load)
 */

type QueryType = 'direct' | 'indirect' | 'distractor';

export interface BenchmarkExample {
  input: { question: string };
  output: Record<string, never>;
  metadata: {
    skillId: string;
    queryType: QueryType;
    expectedSkill?: string;
    shouldNotActivateSkill?: string;
  };
}

const mk = (skillId: string, rows: Array<[string, QueryType]>): BenchmarkExample[] =>
  rows.map(([question, queryType]) => ({
    input: { question },
    output: {},
    metadata: {
      skillId,
      queryType,
      ...(queryType === 'distractor'
        ? { shouldNotActivateSkill: skillId }
        : { expectedSkill: skillId }),
    },
  }));

// ─── PLATFORM ───────────────────────────────────────

export const DASHBOARD_MANAGEMENT_EXAMPLES = mk('dashboard-management', [
  [
    'Create a new Kibana dashboard for our SRE team showing service health metrics and error rates',
    'direct',
  ],
  [
    'Add a panel to my existing Ops Overview dashboard showing disk usage by host over 7 days',
    'direct',
  ],
  [
    'I need a central place to monitor all my microservices — can you set something up for the team?',
    'indirect',
  ],
  [
    'Build a view that gives our security team a quick overview of active alerts and recent detections',
    'indirect',
  ],
  ['Plot CPU usage versus memory usage for all hosts as a scatter chart', 'distractor'],
  ['Create a dashboard showing my sample log data. Decide on visualizations and layout.', 'direct'],
  [
    'Create a dashboard using kibana_sample_data_logs with 6 compact metric panels in a single row: total requests and error count and average bytes and unique hosts and p95 bytes and max memory.',
    'direct',
  ],
  [
    'Create a dashboard using kibana_sample_data_logs with 4 KPI metric panels across the top row and one full-width time series panel directly below them.',
    'direct',
  ],
  ['Help me write an ES|QL query to find slow transactions', 'distractor'],
  ['What fields are available in the logs-* index?', 'distractor'],
]);

export const GRAPH_CREATION_EXAMPLES = mk('graph-creation', [
  ['Create a dependency graph showing how my microservices are connected to each other', 'direct'],
  [
    'Visualize the relationships between hosts and the users accessing them as a node graph',
    'direct',
  ],
  [
    'I want to see which services talk to which other services and where the bottlenecks might be',
    'indirect',
  ],
  ['Map out the network topology of my AWS accounts and the resources they contain', 'indirect'],
  ['Show me a pie chart of alert severity distribution across all active alerts', 'distractor'],
]);

export const SKILL_AUTHORING_EXAMPLES = mk('skill-authoring', [
  ['Create a new skill for my agent that can query our internal JIRA ticketing system', 'direct'],
  [
    'I want to build a skill that knows how to navigate our internal runbook wiki and surface relevant procedures',
    'direct',
  ],
  [
    'My agent does not know how to handle on-call escalation requests — can you add that capability?',
    'indirect',
  ],
  [
    'I want to teach my agent about our internal deployment process so it can guide engineers step by step',
    'indirect',
  ],
  [
    'Build an automated workflow that triggers a Slack notification whenever a critical alert fires',
    'distractor',
  ],
]);

export const VISUALIZATION_CREATION_EXAMPLES = mk('visualization-creation', [
  ['Create a line chart of HTTP 5xx error counts over time from the nginx access logs', 'direct'],
  ['Build a metric visualization showing average CPU utilization across all hosts', 'direct'],
  ['Show me a breakdown of event counts by log level for the last 6 hours', 'indirect'],
  [
    'Set up a monitoring dashboard with three panels: error rate plus latency plus throughput',
    'distractor',
  ],
  [
    'Create a bar chart showing the distribution of response codes in kibana_sample_data_logs.',
    'direct',
  ],
]);

// ─── STREAMS ────────────────────────────────────────

export const KI_IDENTIFICATION_MANAGEMENT_EXAMPLES = mk('ki-identification-management', [
  [
    'Run the KI identification task on the logs.ecs stream to find patterns worth monitoring',
    'direct',
  ],
  ['Check the status of the knowledge indicator discovery job I started earlier', 'direct'],
  [
    'I want the system to scan my event data and automatically surface what is worth monitoring',
    'indirect',
  ],
  [
    'Kick off the background process that finds monitoring-worthy patterns in my stream data',
    'indirect',
  ],
  ['Add a knowledge indicator to track weekly login volume for our admin accounts', 'distractor'],
]);

export const KNOWLEDGE_INDICATORS_MANAGEMENT_EXAMPLES = mk('knowledge-indicators-management', [
  [
    'Create a new knowledge indicator that tracks the p95 latency of the checkout service',
    'direct',
  ],
  ['List all existing knowledge indicators for the payments domain', 'direct'],
  [
    'I want the system to automatically flag unusual patterns in our auth service login rate',
    'indirect',
  ],
  [
    'Set up a feature that lets us detect anomalies in order processing throughput over time',
    'indirect',
  ],
  [
    'Start the automatic discovery process to identify interesting patterns in my logs.otel stream',
    'distractor',
  ],
]);

export const SIG_EVENTS_MANAGEMENT_EXAMPLES = mk('significant-events-management', [
  [
    'Create a new significant event to record the Kafka outage that started yesterday at 14:00 UTC',
    'direct',
  ],
  [
    'Search for all significant events related to the payments service in the last 30 days',
    'direct',
  ],
  [
    'Log that we had a major database failover last Tuesday that affected the order processing pipeline',
    'indirect',
  ],
  ['Find all recorded incidents that impacted the auth service this quarter', 'indirect'],
  [
    "What does the system know about our database cluster's normal behavior patterns?",
    'distractor',
  ],
]);

export const SIG_EVENTS_MEMORY_EXAMPLES = mk('significant-events-memory', [
  [
    'Search the significant events knowledge base for what we know about the payments service architecture',
    'direct',
  ],
  [
    'Add a knowledge base entry describing the normal traffic patterns of our auth microservice',
    'direct',
  ],
  ['What does the system know about our Kafka cluster and its typical behavior?', 'indirect'],
  [
    'Update the memory with the fact that our order-service was migrated to Kubernetes last week',
    'indirect',
  ],
  [
    'Find recent significant events related to latency spikes in the checkout service',
    'distractor',
  ],
]);

export const STREAMS_MANAGEMENT_EXAMPLES = mk('streams-management', [
  ['Show me the schema and field mappings for the logs.otel stream', 'direct'],
  ['Update the retention policy on the logs.ecs.android stream to 90 days', 'direct'],
  [
    'Some of my log events are being dropped at ingestion — what is going wrong with my pipeline?',
    'indirect',
  ],
  [
    'Why is the data quality for my web access logs so poor and how do I fix the field mapping issues?',
    'indirect',
  ],
  [
    'My checkout service has been throwing a lot of 500 errors lately — what is causing the slowdowns?',
    'distractor',
  ],
]);

// ─── SECURITY ───────────────────────────────────────

export const ALERT_ANALYSIS_EXAMPLES = mk('alert-analysis', [
  [
    'Help me triage the critical alert for Potential Credential Dumping via Mimikatz on host WIN-DC01',
    'direct',
  ],
  ['Show me all unacknowledged high-severity security alerts from the last 4 hours', 'direct'],
  [
    'Something suspicious just fired in our environment — can you pull it up and tell me if it is worth investigating?',
    'indirect',
  ],
  [
    'I got paged about an alert on a server in the finance network — what should I look at first?',
    'indirect',
  ],
  [
    'What is the risk score for user john.doe@company.com and what unusual behaviors is he showing?',
    'distractor',
  ],
]);

export const AUTOMATIC_TROUBLESHOOTING_EXAMPLES = mk(
  'elastic-defend-configuration-troubleshooting',
  [
    [
      'My Elastic Defend policy is not blocking ransomware samples — help me troubleshoot the endpoint configuration',
      'direct',
    ],
    [
      'A trusted application exception I added for our backup agent is not being applied on Windows hosts',
      'direct',
    ],
    [
      'Elastic Defend keeps quarantining our internal monitoring tool even though we listed it as allowed',
      'indirect',
    ],
    [
      'Agents on a subset of our Windows endpoints are not enforcing the correct policy — how do I debug this?',
      'indirect',
    ],
    [
      'Are there any high-severity alerts triggered by Elastic Defend on production endpoints in the last hour?',
      'distractor',
    ],
  ]
);

export const DETECTION_RULE_EDIT_EXAMPLES = mk('detection-rule-edit', [
  [
    'Create a new detection rule that fires when a user runs whoami followed by net user within 60 seconds',
    'direct',
  ],
  [
    'Update the severity of the Suspicious PowerShell Execution rule from medium to high and add the persistence MITRE tag',
    'direct',
  ],
  [
    'I want to start catching brute force login attempts against our Active Directory — set something up for that',
    'indirect',
  ],
  [
    'The rule monitoring our AWS root account logins is not firing correctly — can you fix the detection query?',
    'indirect',
  ],
  [
    'List all detection rules tagged with Credential Access that are currently enabled',
    'distractor',
  ],
]);

export const ENTITY_ANALYTICS_EXAMPLES = mk('entity-analytics', [
  [
    'Look up the entity risk score for host dc01.corp.local and show me its recent alert contributions',
    'direct',
  ],
  ['Which users in our environment have the highest risk scores right now?', 'direct'],
  [
    'Something feels off about this user account — can you tell me if they have been flagged for anything unusual?',
    'indirect',
  ],
  [
    'Find me the riskiest hosts in the finance network segment based on recent behavior',
    'indirect',
  ],
  [
    'Are there any ML anomaly detection jobs finding unusual behavior patterns in my environment?',
    'distractor',
  ],
]);

export const FIND_RULES_EXAMPLES = mk('find-security-rules', [
  ['Show me all enabled detection rules that cover MITRE technique T1078 Valid Accounts', 'direct'],
  ['How many detection rules do I have covering the Lateral Movement tactic?', 'direct'],
  [
    'I want to know what detection coverage I have for ransomware before my security audit next week',
    'indirect',
  ],
  ['Can you summarize which MITRE ATT&CK techniques we are currently monitoring for?', 'indirect'],
  [
    'Set up a new rule to detect when a process creates a scheduled task on a Windows host',
    'distractor',
  ],
]);

export const FIND_SECURITY_ML_JOBS_EXAMPLES = mk('find-security-ml-jobs', [
  [
    'Find all ML jobs that are detecting anomalous user behavior in my security environment',
    'direct',
  ],
  ['Which machine learning jobs are currently running for security anomaly detection?', 'direct'],
  [
    'Are there any automated jobs looking for unusual login patterns or off-hours access by privileged accounts?',
    'indirect',
  ],
  [
    'I want to know if the system is automatically detecting anything suspicious about service account behavior',
    'indirect',
  ],
  ['Show me users with high risk scores and unusual behavioral signals this week', 'distractor'],
]);

export const SIEM_READINESS_EXAMPLES = mk('siem-readiness', [
  [
    'Run a SIEM readiness assessment and tell me what data coverage gaps we have across log categories',
    'direct',
  ],
  [
    'Check whether our ECS field compatibility is sufficient to support the out-of-the-box detection rules',
    'direct',
  ],
  [
    'Before our security audit I need to know how complete our log coverage is and whether ingestion pipelines are healthy',
    'indirect',
  ],
  [
    'We are onboarding a new SOC team — how healthy is our security data pipeline for running detections?',
    'indirect',
  ],
  [
    'Is our environment meeting PCI DSS requirements for logging and audit trail retention?',
    'distractor',
  ],
]);

export const THREAT_HUNTING_EXAMPLES = mk('threat-hunting', [
  ['Hunt for signs of lateral movement using Windows event logs over the past 7 days', 'direct'],
  [
    'Write ES|QL queries to find processes that are communicating with rare external IP addresses',
    'direct',
  ],
  [
    'I suspect someone might be moving around our network without triggering any alerts — how do I find that?',
    'indirect',
  ],
  [
    'Look for statistically rare process executions across our endpoints that might indicate malware',
    'indirect',
  ],
  [
    'I have a fired alert for lateral movement on host CORP-WKS-042 — help me investigate it and find related activity',
    'distractor',
  ],
]);

// ─── OBSERVABILITY ──────────────────────────────────

export const OBSERVABILITY_INVESTIGATION_EXAMPLES = mk('observability.investigation', [
  [
    'Investigate why the checkout service has had elevated error rates for the last 30 minutes',
    'direct',
  ],
  ['Show me all firing observability alerts for services in the payments namespace', 'direct'],
  [
    'Something is wrong with our order flow — customers are reporting slow checkouts and intermittent failures',
    'indirect',
  ],
  [
    'My SLO is breaching — which service is the likely cause and what does the recent metrics data show?',
    'indirect',
  ],
  [
    'Why did our checkout service start failing at 14:32 UTC today — trace back exactly what broke and why',
    'distractor',
  ],
  ['what alerts do i have', 'indirect'],
  ['We are seeing errors on the cart service. Can you investigate what is happening?', 'indirect'],
  ['Users are reporting that checkout is failing. Can you investigate?', 'indirect'],
  [
    'The email service appears to be consuming increasing amounts of memory. Can you investigate what might be causing it?',
    'indirect',
  ],
  ['Fraud-detection service seems to be running slowly. Can you investigate why?', 'indirect'],
  [
    'We are seeing a large spike in traffic to the frontend. Can you investigate what is causing it?',
    'indirect',
  ],
  ['Investigate what is causing issues with the checkout service.', 'indirect'],
  ['Are there any active alerts? Investigate whatever you find.', 'indirect'],
  ['What skills do you have available? List all of them.', 'distractor'],
]);

export const SERVICE_MAP_EXAMPLES = mk('service-map', [
  ['Show me the APM service map for our production environment', 'direct'],
  ['Display the service topology of all services connected to the payments-api in APM', 'direct'],
  [
    'Which downstream services does the order API call and are any of them currently showing latency increases?',
    'indirect',
  ],
  [
    'I want to understand the full call chain from our frontend to the database for the checkout flow',
    'indirect',
  ],
  [
    'Show me how the services in my environment are connected to each other and which ones are upstream and downstream dependencies',
    'distractor',
  ],
  ['Show me the service map for checkout', 'direct'],
  ['Visualize the topology around the payment service', 'direct'],
  ['Show the service map for frontend', 'direct'],
  ['Map out the dependencies for the cart service', 'indirect'],
]);

// ─── SEARCH ─────────────────────────────────────────

export const SEARCH_CATALOG_ECOMMERCE_EXAMPLES = mk('search.catalog-ecommerce', [
  [
    'Build product search for my e-commerce store with facets for category and brand and price range',
    'direct',
  ],
  [
    'Implement autocomplete and did-you-mean suggestions for our online shop using Elasticsearch',
    'direct',
  ],
  [
    'Our shoppers are not finding the products they want — we need better search with multi-attribute filtering',
    'indirect',
  ],
  [
    'Set up search for our inventory system so warehouse staff can filter products by multiple attributes simultaneously',
    'indirect',
  ],
  [
    'I want customers to search by describing what they want in plain language rather than typing exact product names',
    'distractor',
  ],
]);

export const SEARCH_ELASTICSEARCH_ONBOARDING_EXAMPLES = mk('search.elasticsearch-onboarding', [
  [
    'I want to get started with Elasticsearch — walk me through setting up my first index and running search queries',
    'direct',
  ],
  [
    'Help me go from zero to a working search feature for my application using Elasticsearch',
    'direct',
  ],
  [
    'I am new to Elastic and want to build a search bar for my website — where do I start?',
    'indirect',
  ],
  [
    'We just set up our Elasticsearch cluster and need to build search into our app — what is the right approach?',
    'indirect',
  ],
  [
    'Teach me how analyzers and tokenizers work in Elasticsearch with hands-on examples I can run in Dev Console',
    'distractor',
  ],
]);

export const SEARCH_ELASTICSEARCH_TUTORIAL_EXAMPLES = mk('search.elasticsearch-tutorial', [
  [
    'Walk me through how the bool query works in Elasticsearch with examples I can run in Dev Tools',
    'direct',
  ],
  [
    'Give me a tutorial on how Elasticsearch aggregations work using sample data I can follow along with',
    'direct',
  ],
  [
    'Teach me about semantic_text fields and how they differ from regular text fields — with runnable examples',
    'indirect',
  ],
  [
    'Show me step by step how to set up an ingest pipeline with Grok parsing on sample log data',
    'indirect',
  ],
  [
    'I want to add full-text search with filters and autocomplete to my product catalog app — what should I use?',
    'distractor',
  ],
]);

export const SEARCH_KEYWORD_SEARCH_EXAMPLES = mk('search.keyword-search', [
  [
    'How do I build full-text search with filters and facets for a document management system using Elasticsearch?',
    'direct',
  ],
  [
    'Set up keyword search with autocomplete and did-you-mean suggestions for our internal knowledge base',
    'direct',
  ],
  [
    'Users need to search our support ticket database by keyword and filter results by status and date range',
    'indirect',
  ],
  [
    'Our site has a search box and results are poor for partial matches and common misspellings — how do I improve relevance?',
    'indirect',
  ],
  [
    'I want users to be able to search by meaning and intent rather than exact keyword matches',
    'distractor',
  ],
]);

export const SEARCH_RAG_CHATBOT_EXAMPLES = mk('search.rag-chatbot', [
  [
    'Build a RAG chatbot that answers questions from our internal documentation stored in Elasticsearch',
    'direct',
  ],
  [
    'Set up a Q&A system using Elasticsearch as the retrieval layer and Claude as the generation model',
    'direct',
  ],
  [
    'I want users to ask questions in natural language and get answers sourced directly from our knowledge base',
    'indirect',
  ],
  [
    'Help me build an AI assistant that uses our product manuals as its knowledge source to answer customer questions',
    'indirect',
  ],
  [
    'How do I implement hybrid BM25 and vector search with a cross-encoder reranker for better relevance?',
    'distractor',
  ],
]);

export const SEARCH_USE_CASE_LIBRARY_EXAMPLES = mk('search.use-case-library', [
  [
    'What can I build with Elasticsearch — give me an overview of the different use cases it supports',
    'direct',
  ],
  [
    'What are the different types of search applications that enterprises typically build on Elasticsearch?',
    'direct',
  ],
  [
    'I am evaluating Elasticsearch for our company — what problems is it best at solving?',
    'indirect',
  ],
  [
    'I do not know where to start with Elastic — show me what kinds of applications people actually build with it',
    'indirect',
  ],
  [
    'How do I get started building my first search application in Elasticsearch from scratch?',
    'distractor',
  ],
]);

export const SEARCH_VECTOR_HYBRID_SEARCH_EXAMPLES = mk('search.vector-hybrid-search', [
  [
    'Set up semantic search using dense_vector and kNN in Elasticsearch for my document corpus',
    'direct',
  ],
  [
    'Combine BM25 keyword search with vector search using RRF to get better relevance for my product catalog',
    'direct',
  ],
  [
    'My users search in natural language and exact keyword matching is not giving good results — how do I fix this?',
    'indirect',
  ],
  [
    'I want to use Elasticsearch as a vector database to power AI-driven similarity search for my content platform',
    'indirect',
  ],
  [
    'Build a chatbot that can answer questions from my internal documentation using Elasticsearch and an LLM',
    'distractor',
  ],
]);

// All examples combined — use for a single aggregate run across all skills
export const ALL_SKILL_EXAMPLES: BenchmarkExample[] = [
  ...DASHBOARD_MANAGEMENT_EXAMPLES,
  ...GRAPH_CREATION_EXAMPLES,
  ...SKILL_AUTHORING_EXAMPLES,
  ...VISUALIZATION_CREATION_EXAMPLES,
  ...KI_IDENTIFICATION_MANAGEMENT_EXAMPLES,
  ...KNOWLEDGE_INDICATORS_MANAGEMENT_EXAMPLES,
  ...SIG_EVENTS_MANAGEMENT_EXAMPLES,
  ...SIG_EVENTS_MEMORY_EXAMPLES,
  ...STREAMS_MANAGEMENT_EXAMPLES,
  ...ALERT_ANALYSIS_EXAMPLES,
  ...AUTOMATIC_TROUBLESHOOTING_EXAMPLES,
  ...DETECTION_RULE_EDIT_EXAMPLES,
  ...ENTITY_ANALYTICS_EXAMPLES,
  ...FIND_RULES_EXAMPLES,
  ...FIND_SECURITY_ML_JOBS_EXAMPLES,
  ...SIEM_READINESS_EXAMPLES,
  ...THREAT_HUNTING_EXAMPLES,
  ...OBSERVABILITY_INVESTIGATION_EXAMPLES,
  ...SERVICE_MAP_EXAMPLES,
  ...SEARCH_CATALOG_ECOMMERCE_EXAMPLES,
  ...SEARCH_ELASTICSEARCH_ONBOARDING_EXAMPLES,
  ...SEARCH_ELASTICSEARCH_TUTORIAL_EXAMPLES,
  ...SEARCH_KEYWORD_SEARCH_EXAMPLES,
  ...SEARCH_RAG_CHATBOT_EXAMPLES,
  ...SEARCH_USE_CASE_LIBRARY_EXAMPLES,
  ...SEARCH_VECTOR_HYBRID_SEARCH_EXAMPLES,
];
