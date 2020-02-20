/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';

export const User = t.type({
  userId: t.number,
  name: t.string,
});

// example risk score
export const riskScore = new t.Type<number, number, unknown>(
  'riskScore',
  t.number.is,
  (input, context) => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= 100
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);

// default values test and it should all be strings
export const references = new t.Type<string[], string[], unknown>(
  'references',
  (input: unknown): input is string[] => Array.isArray(input),
  (input, context) => {
    if (input == null) {
      return t.success([]);
    } else if (Array.isArray(input)) {
      const everythingIsAString = input.every(element => typeof element === 'string');
      if (everythingIsAString) {
        return t.success(input);
      }
    }
    return t.failure(input, context);
  },
  t.identity
);

export const createRulesSchema = t.intersection([
  t.type({
    created_at: DateFromISOString,
    updated_at: DateFromISOString,
    created_by: t.string,
    description: t.string,
    risk_score: riskScore,
  }),
  t.partial({ references }),
]);

export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;

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
