/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  description,
  risk_score,
  references,
  created_at,
  created_by,
  updated_at,
  saved_id,
  timeline_id,
  timeline_title,
  type,
  threat,
} from './schemas';

/**
 * This is the required fields for the rules schema. Put all required properties on
 * this base for schemas such as create_rules, update_rules, etc...
 */
export const requiredRulesSchema = t.type({
  created_at,
  updated_at,
  created_by,
  description,
  risk_score,
  references,
  type,
  threat,
});

export type RequiredRulesSchema = t.TypeOf<typeof requiredRulesSchema>;

/**
 * This is the partial or optional fields for the rules schema. Put all optional
 * properties on this. If you have type dependents or exclusive or situations add
 * them here AND update the check_type_dependents file.
 */
export const partialRulesSchema = t.partial({
  saved_id,
  timeline_id,
  timeline_title,
});

/**
 * This is the rules schema with all base and all optional properties
 * on it merged together
 */
export const rulesSchema = t.intersection([
  t.exact(partialRulesSchema),
  t.exact(requiredRulesSchema),
]);
export type RulesSchema = t.TypeOf<typeof rulesSchema>;

/*
"description": "Identifies Windows programs run from unexpected parent processes. This could indicate masquerading or other strange activity on a system.",
"enabled": false,
"false_positives": [],
"from": "now-6m",
"id": "ff043f57-adf0-4cbc-8752-efc85b90de3d",
"immutable": true,
"index": [
  "winlogbeat-*"
],
"interval": "5m",
"rule_id": "35df0dd8-092d-4a83-88c1-5151a804f31b",
"language": "kuery",
"output_index": ".siem-signals-hassanabad-frank-default",
"max_signals": 100,
"risk_score": 47,
"name": "Unusual Parent-Child Relationship ",
"query": "   event.action:\"Process Create (rule: ProcessCreate)\" and process.parent.executable:* and   (      (process.name:\"smss.exe\" and not process.parent.name:(\"System\" or \"smss.exe\")) or       (process.name:\"csrss.exe\" and not process.parent.name:(\"smss.exe\" or \"svchost.exe\")) or       (process.name:\"wininit.exe\" and not process.parent.name:\"smss.exe\") or       (process.name:\"winlogon.exe\" and not process.parent.name:\"smss.exe\") or       (process.name:\"lsass.exe\" and not process.parent.name:\"wininit.exe\") or       (process.name:\"LogonUI.exe\" and not process.parent.name:(\"winlogon.exe\" or \"wininit.exe\")) or       (process.name:\"services.exe\" and not process.parent.name:\"wininit.exe\") or       (process.name:\"svchost.exe\" and not process.parent.name:(\"services.exe\" or \"MsMpEng.exe\")) or      (process.name:\"spoolsv.exe\" and not process.parent.name:\"services.exe\") or       (process.name:\"taskhost.exe\" and not process.parent.name:(\"services.exe\" or \"svchost.exe\")) or       (process.name:\"taskhostw.exe\" and not process.parent.name:(\"services.exe\" or \"svchost.exe\")) or       (process.name:\"userinit.exe\" and not process.parent.name:(\"dwm.exe\" or \"winlogon.exe\"))    )",
"references": [],
"severity": "medium",
"updated_by": "elastic_kibana",
"tags": [
  "Elastic",
  "Windows"
],
"to": "now",
"type": "query",
"threat": [
  {
    "framework": "MITRE ATT&CK",
    "tactic": {
      "id": "TA0004",
      "name": "Privilege Escalation",
      "reference": "https://attack.mitre.org/tactics/TA0004/"
    },
    "technique": [
      {
        "id": "T1093",
        "name": "Process Hollowing",
        "reference": "https://attack.mitre.org/techniques/T1093/"
      }
    ]
  }
],
"version": 1
}
*/
