#!/usr/bin/env python3
"""
Run GEPA optimize_anything in generalization mode for Automatic Import V2 prompts.
Loads golden dataset from the golden/ directory and optional seed prompts from seed_prompts.json.
"""
from __future__ import annotations

import json
import os
import sys

# Add parent so we can import evaluator
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evaluator import evaluate

try:
    from gepa.optimize_anything import (
        optimize_anything,
        GEPAConfig,
        EngineConfig,
        ReflectionConfig,
    )
except ImportError as e:
    print("Install gepa: pip install gepa", file=sys.stderr)
    raise SystemExit(1) from e

# Paths relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GOLDEN_DIR = os.path.join(SCRIPT_DIR, "..", "golden")
SEED_PROMPTS_PATH = os.path.join(SCRIPT_DIR, "seed_prompts.json")


def load_golden_examples():
    """Load golden examples and split into train/val from manifest."""
    manifest_path = os.path.join(GOLDEN_DIR, "manifest.json")
    if not os.path.isfile(manifest_path):
        raise FileNotFoundError(f"manifest.json not found at {manifest_path}")

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    def load_example(eid: str) -> dict:
        example_path = os.path.join(GOLDEN_DIR, f"{eid}.json")
        if not os.path.isfile(example_path):
            raise FileNotFoundError(f"Example {eid}.json not found at {example_path}")
        try:
            with open(example_path, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise SystemExit(
                f"Invalid JSON in {eid}.json: {e}. Use the golden/ scripts to generate examples (log_to_golden.js or log_and_expected_to_golden.js)."
            ) from e

    train = [load_example(eid) for eid in manifest.get("train", [])]
    val = [load_example(eid) for eid in manifest.get("val", [])]
    return train, val


def main():
    # Seed candidate: single prompt (INGEST_PIPELINE_GENERATOR_PROMPT) or dict
    if os.path.isfile(SEED_PROMPTS_PATH):
        with open(SEED_PROMPTS_PATH, encoding="utf-8") as f:
            seed_data = json.load(f)
        seed_candidate = seed_data.get("INGEST_PIPELINE_GENERATOR_PROMPT") or seed_data
        if isinstance(seed_candidate, dict) and not seed_candidate.get("INGEST_PIPELINE_GENERATOR_PROMPT"):
            seed_candidate = seed_candidate.get("INGEST_PIPELINE_GENERATOR_PROMPT") or list(seed_candidate.values())[0]
    else:
        seed_candidate = (
            "You are an expert Elasticsearch ingest pipeline generator. "
            "Create an optimal ingest pipeline that parses the provided log samples."
        )

    trainset, valset = load_golden_examples()
    if not trainset:
        print("No train examples in manifest. Add at least one.", file=sys.stderr)
        sys.exit(1)

    auth_headers = None
    auth_env = os.environ.get("GEPA_AUTH_HEADERS")
    if auth_env:
        try:
            auth_headers = json.loads(auth_env)
        except json.JSONDecodeError:
            print("Warning: GEPA_AUTH_HEADERS is not valid JSON, ignoring.", file=sys.stderr)

    def evaluator(candidate: str | dict, example: dict):
        return evaluate(candidate, example, auth_headers=auth_headers)

    # Reflection LM: used by GEPA to propose prompt improvements. Defaults to Bedrock (same as Kibana connector).
    # Set GEPA_REFLECTION_MODEL to a litellm model string (e.g. bedrock/us.anthropic.claude-sonnet-4-5-20250929-v1:0)
    # or openai/gpt-4o. For Bedrock, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION_NAME.
    reflection_model = os.environ.get(
        "GEPA_REFLECTION_MODEL",
        "bedrock/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    )
    if reflection_model.strip().lower().startswith("bedrock/"):
        try:
            import boto3  # noqa: F401
        except ImportError:
            print(
                "Reflection model is Bedrock but boto3 is not installed. Run: pip install boto3",
                file=sys.stderr,
            )
            sys.exit(1)

    result = optimize_anything(
        seed_candidate=seed_candidate,
        evaluator=evaluator,
        dataset=trainset,
        valset=valset if valset else None,
        config=GEPAConfig(
            engine=EngineConfig(max_metric_calls=50, cache_evaluation=True),
            reflection=ReflectionConfig(reflection_lm=reflection_model),
        ),
    )

    best = result.best_candidate
    print("Best candidate (INGEST_PIPELINE_GENERATOR_PROMPT):")
    if isinstance(best, dict):
        print(best.get("INGEST_PIPELINE_GENERATOR_PROMPT", best))
    else:
        print(best)

    out_path = os.path.join(SCRIPT_DIR, "optimized_prompt.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"INGEST_PIPELINE_GENERATOR_PROMPT": best if isinstance(best, str) else best.get("INGEST_PIPELINE_GENERATOR_PROMPT", best)}, f, indent=2)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
