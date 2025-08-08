/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';

export function createDevModeConfig(baseServersConfigDir: string): string {
  const evalsDir = path.join(baseServersConfigDir, 'evals');
  fs.mkdirSync(evalsDir, { recursive: true });

  const localJsonPath = path.join(evalsDir, 'local.json');
  if (!fs.existsSync(localJsonPath)) {
    const localConfig = {
      serverless: false,
      isCloud: false,
      hosts: {
        kibana: 'http://elastic:changeme@localhost:5601/nry',
        elasticsearch: 'http://elastic:changeme@localhost:9200',
      },
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    };
    fs.writeFileSync(localJsonPath, JSON.stringify(localConfig, null, 2));
  }

  return evalsDir;
}
