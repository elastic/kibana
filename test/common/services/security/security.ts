/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { format as formatUrl } from 'url';

import { ToolingLog } from '@kbn/dev-utils';

import { Role } from './role';
import { User } from './user';
import { FtrProviderContext } from '../../ftr_provider_context';

export class SecurityService {
  role = new Role(this.kibanaUrl, this.log);
  user = new User(this.kibanaUrl, this.log);

  constructor(protected readonly kibanaUrl: string, protected readonly log: ToolingLog) {}
}

export function SecurityProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  return new SecurityService(formatUrl(config.get('servers.kibana')), log);
}
