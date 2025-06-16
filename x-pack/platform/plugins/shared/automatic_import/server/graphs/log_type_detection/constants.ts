/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamplesFormat } from '../../../common';

export const EX_ANSWER_LOG_TYPE: SamplesFormat = {
  name: 'csv',
  header: false,
  columns: ['ip', 'timestamp', 'request', 'status', '', 'bytes'],
};
export const LOG_FORMAT_EXAMPLE_LOGS = [
  {
    example:
      '[18/Feb/2025:22:39:16 +0000] CONNECT conn=20597223 from=10.1.1.1:1234 to=10.2.3.4:4389 protocol=LDAP',
    format: 'Structured',
  },
  {
    example:
      '2021-10-22 22:12:09,871 DEBUG [org.keycloak.events] (default task-3) operationType=CREATE, realmId=test, clientId=abcdefgh userId=sdfsf-b89c-4fca-9088-sdfsfsf, ipAddress=10.1.1.1, resourceType=USER, resourcePath=users/07972d16-b173-4c99-803d-90f211080f40',
    format: 'Structured',
  },
  {
    example:
      '<166>Aug 21 22:08:13 myfirewall.my-domain.tld (squid-1)[6802]: [1598040493.253 325](tel:1598040493.253 325) 175.16.199.1 TCP_MISS/304 2912 GET https://github.com/3ilson/pfelk/file-list/master - HIER_DIRECT/81.2.69.145 -',
    format: 'Unstructured',
  },
  {
    example:
      '<30>1 2021-07-03T23:01:56.547105-05:00 pfSense.example.com charon 18610 - - 08[CFG]   ppk_id = (null)',
    format: 'Unstructured',
  },
  {
    example:
      '2016/10/25 14:49:34 [error] 54053#0: *1 open() "/usr/local/Cellar/nginx/1.10.2_1/html/favicon.ico" failed (2: No such file or directory)',
    format: 'Unstructured',
  },
  {
    example:
      '2025/02/12|14:42:42:871|FAKePolicyNumber-ws-sharedendorsement-autocore-54--fhfh-rghrg-0|INFO |http-nio-8080-exec-58 |RatingHelper.sendToPolicyPro:1521 |-call to  PolicyPro for /rest/v2/actions/ISSUEEXT successful',
    format: 'Unstructured',
  },
];
