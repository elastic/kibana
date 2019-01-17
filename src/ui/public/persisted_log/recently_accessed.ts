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
import chrome from 'ui/chrome';
import { PersistedLog } from './';
import { createLogKey } from './create_log_key';

export interface RecentlyAccessedHistoryItem {
  link: string;
  label: string;
  id: string;
}

class RecentlyAccessed {
  public history: PersistedLog<RecentlyAccessedHistoryItem>;

  constructor() {
    const logKey = createLogKey('recentlyAccessed', chrome.getBasePath());
    this.history = new PersistedLog(logKey, {
      maxLength: 20,
      filterDuplicates: true,
      isDuplicate: (oldItem, newItem) => {
        return oldItem.id === newItem.id;
      },
    });
  }

  public add(link: string, label: string, id: string) {
    this.history.add({
      link,
      label,
      id,
    });
  }

  public get() {
    return this.history.get();
  }
}

export const recentlyAccessed = new RecentlyAccessed();
