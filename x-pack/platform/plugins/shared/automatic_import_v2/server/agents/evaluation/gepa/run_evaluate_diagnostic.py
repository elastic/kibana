#!/usr/bin/env python3
"""
One-off diagnostic: call evaluate on a small golden example and print result summary.
Run from the gepa directory. Uses 2 samples by default. Only needs stdlib (no dotenv).

  python run_evaluate_diagnostic.py
  python run_evaluate_diagnostic.py 5   # use first 5 samples
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GOLDEN_DIR = os.path.join(SCRIPT_DIR, "..", "golden")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 2
TIMEOUT = int(os.environ.get("GEPA_EVALUATE_TIMEOUT", "600"))


def load_env() -> None:
    env_path = os.path.join(SCRIPT_DIR, ".env")
    if os.path.isfile(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> None:
    load_env()
    kibana_url = (os.environ.get("KIBANA_URL") or "http://localhost:5601").rstrip("/")
    connector_id = os.environ.get("GEPA_CONNECTOR_ID", "")
    if not connector_id:
        print("Set GEPA_CONNECTOR_ID in .env", file=sys.stderr)
        sys.exit(1)

    with open(os.path.join(GOLDEN_DIR, "test-ftd-fix.json")) as f:
        ex = json.load(f)
    input_logs = ex["input_logs"][:N]
    expected_outputs = ex["expected_outputs"][:N]

    url = f"{kibana_url}/internal/automatic_import_v2/evaluate"
    body = {
        "samples": input_logs,
        "connectorId": connector_id,
        "promptOverrides": {"INGEST_PIPELINE_GENERATOR_PROMPT": (
            "You are an expert Elasticsearch ingest pipeline generator. "
            "Create an optimal pipeline that parses the provided log samples. "
            "Use the validate_ingest_pipeline tool to test every pipeline."
        )},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    print(f"POST {url} ({N} samples, timeout={TIMEOUT}s)...")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        if e.fp:
            print(e.fp.read().decode()[:2000])
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Request error: {e.reason}")
        sys.exit(1)
    except TimeoutError:
        print("Request timed out")
        sys.exit(1)

    pipeline = data.get("current_pipeline")
    actual_outputs = data.get("pipeline_generation_results") or []
    validation = data.get("pipeline_validation_results") or {}

    print("current_pipeline present:", pipeline is not None)
    print("pipeline_generation_results count:", len(actual_outputs))
    print("success_rate:", validation.get("success_rate"))
    print("failed_samples:", validation.get("failed_samples"))
    print("total_samples:", validation.get("total_samples"))
    print("failure_details (first 3):", json.dumps(validation.get("failure_details", [])[:3], indent=2))

    if len(actual_outputs) < len(expected_outputs):
        print("\n-> Score would be 0: not enough actual outputs (validator may not have run or all failed).")
    else:
        print("\n-> Have actual outputs; score depends on match to expected_outputs.")


if __name__ == "__main__":
    main()
