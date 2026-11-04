/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { createEmptyApp } from '../model/app_layout';
import { useNotebook } from './notebook_context';

const ADD_TO_APP_LABEL = i18n.translate('xpack.notebook.cell.addToApp', {
  defaultMessage: 'Add to app',
});

/** Adds the cell to one of the notebook's apps, or to a new one, and shows that app. */
export const AddToAppButton = ({ cellId }: { cellId: string }) => {
  const { store, sidePanel$, activeAppId$ } = useNotebook();
  const apps = useStateFromPublishingSubject(store.apps$);
  const [isOpen, setIsOpen] = useState(false);

  const addTo = (appId: string) => {
    setIsOpen(false);
    store.addCellToApp(appId, cellId);
    activeAppId$.next(appId);
    sidePanel$.next('app');
  };

  const addToNewApp = () => {
    const app = createEmptyApp(store.apps$.getValue());
    store.addApp(app);
    addTo(app.id);
  };

  const onClick = () => {
    const activeAppId = activeAppId$.getValue();
    const openApp =
      sidePanel$.getValue() === 'app'
        ? apps.find(({ id }) => id === activeAppId) ?? apps[0]
        : undefined;
    if (openApp) return addTo(openApp.id);
    if (apps.length === 0) return addToNewApp();
    if (apps.length === 1) return addTo(apps[0].id);
    setIsOpen((open) => !open);
  };

  const button = (
    <EuiToolTip content={ADD_TO_APP_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="addToDashboard"
        aria-label={ADD_TO_APP_LABEL}
        onClick={onClick}
        data-test-subj="notebookCellAddToApp"
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={ADD_TO_APP_LABEL}
      button={button}
    >
      <EuiContextMenuPanel
        items={[
          ...apps.map((app) => {
            const isAdded = app.panels.some((panel) => panel.cellId === cellId);
            return (
              <EuiContextMenuItem
                key={app.id}
                icon={isAdded ? 'check' : 'empty'}
                disabled={isAdded}
                onClick={() => addTo(app.id)}
              >
                {app.title}
              </EuiContextMenuItem>
            );
          }),
          <EuiHorizontalRule key="rule" margin="none" />,
          <EuiContextMenuItem
            key="new"
            icon="plusCircle"
            onClick={addToNewApp}
            data-test-subj="notebookCellAddToNewApp"
          >
            {i18n.translate('xpack.notebook.cell.addToNewApp', { defaultMessage: 'New app' })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
