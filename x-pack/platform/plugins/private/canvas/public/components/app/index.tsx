/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppUpdater, ScopedHistory } from '@kbn/core/public';
import PropTypes from 'prop-types';
import React, { FC, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
// @ts-expect-error
import { shortcutManager } from '../../lib/shortcut_manager';
import { CanvasRouter } from '../../routes';
import { Flyouts } from '../flyouts';
import { getSessionStorage } from '../../lib/storage';
import { SESSIONSTORAGE_LASTPATH } from '../../../common/lib';
import { coreServices } from '../../services/kibana_services';

class ShortcutManagerContextWrapper extends React.Component<React.PropsWithChildren<{}>> {
  static childContextTypes = {
    shortcuts: PropTypes.object.isRequired,
  };

  getChildContext() {
    return { shortcuts: shortcutManager };
  }

  render() {
    return <>{this.props.children}</>;
  }
}

export const App: FC<{ history: ScopedHistory; appUpdater: BehaviorSubject<AppUpdater> }> = ({
  history,
  appUpdater,
}) => {
  useEffect(() => {
    return history.listen(({ pathname, search }) => {
      const path = pathname + search;
      appUpdater.next(() => ({
        defaultPath: path,
      }));

      getSessionStorage().set(
        `${SESSIONSTORAGE_LASTPATH}:${coreServices.http.basePath.get()}`,
        path
      );
    });
  });

  return (
    <ShortcutManagerContextWrapper>
      <div className="canvas canvasContainer">
        <CanvasRouter history={history} />
        <Flyouts />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
