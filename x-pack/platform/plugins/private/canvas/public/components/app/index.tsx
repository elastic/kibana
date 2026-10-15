/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppUpdater, ScopedHistory } from '@kbn/core/public';
import PropTypes from 'prop-types';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { BehaviorSubject } from 'rxjs';
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
  const { euiTheme } = useEuiTheme();
  // Reacts to reload-less color-mode toggles (replaces `background-color` in main.scss).
  const containerStyles = useMemo(() => css({ backgroundColor: euiTheme.colors.body }), [euiTheme]);

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
      <div className="canvas canvasContainer" css={containerStyles}>
        <CanvasRouter history={history} />
        <Flyouts />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
