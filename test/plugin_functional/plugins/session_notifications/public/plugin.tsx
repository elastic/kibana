/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
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
