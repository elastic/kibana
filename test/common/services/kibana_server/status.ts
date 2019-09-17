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

import { Loader } from './loader';

interface Status {
  id: string;
  state: string;
  icon: string;
  message: string;
  uiColor: string;
  since: string;
}

interface StatusResponse {
  name: string;
  uuid: string;
  version: {
    number: number;
    build_hash: string;
    build_number: number;
    build_snapshot: boolean;
  };
  status: {
    overall: Status;
    statuses: Status[];
  };
  metrics: unknown;
}

export class KibanaServerStatus {
  private readonly loader = new Loader({
    baseURL: this.kibanaServerUrl,
  });

  constructor(private readonly kibanaServerUrl: string) {}

  async get() {
    return await this.loader.req<StatusResponse>('get status', {
      url: 'api/status',
    });
  }

  async getOverallState() {
    const status = await this.get();
    return status.status.overall.state;
  }
}
