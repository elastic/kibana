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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { AppPluginDependenciesStart, AppPluginDependenciesSetup } from './types';

export class SessionNotificationsPlugin implements Plugin {
  private sessionIds: Array<string | undefined> = [];
  public setup(core: CoreSetup, { navigation }: AppPluginDependenciesSetup) {
    const showSessions = {
      id: 'showSessionsButton',
      label: 'Show Sessions',
      description: 'Sessions',
      run: () => {
        core.notifications.toasts.addInfo(this.sessionIds.join(','), {
          toastLifeTimeMs: 50000,
        });
      },
      tooltip: () => {
        return this.sessionIds.join(',');
      },
      testId: 'showSessionsButton',
    };

    navigation.registerMenuItem(showSessions);

    const clearSessions = {
      id: 'clearSessionsButton',
      label: 'Clear Sessions',
      description: 'Sessions',
      run: () => {
        this.sessionIds.length = 0;
      },
      testId: 'clearSessionsButton',
    };

    navigation.registerMenuItem(clearSessions);
  }

  public start(core: CoreStart, { data }: AppPluginDependenciesStart) {
    core.application.currentAppId$.subscribe(() => {
      this.sessionIds.length = 0;
    });

    data.search.session.getSession$().subscribe((sessionId?: string) => {
      this.sessionIds.push(sessionId);
    });
  }
  public stop() {}
}
