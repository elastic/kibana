/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { EuiGlobalToastList, Toast } from '@elastic/eui';
import uuid from 'uuid';
import { EditorFrameInstance } from '../types';
import { NativeRenderer } from '../native_renderer';

export function App({ editorFrame }: { editorFrame: EditorFrameInstance }) {
  const [state, setState] = useState<Toast[]>([]);

  return (
    <I18nProvider>
      <div>
        <EuiGlobalToastList
          toasts={state}
          dismissToast={toast => setState(state.filter(t => t !== toast))}
          toastLifeTimeMs={6000}
        />
        <NativeRenderer
          render={editorFrame.mount}
          nativeProps={{
            onError: (e: { message: string }) =>
              setState([
                ...state,
                {
                  id: uuid.v4(),
                  color: 'danger',
                  iconType: 'alert',
                  title: <p>{e.message}</p>,
                },
              ]),
          }}
        />
      </div>
    </I18nProvider>
  );
}
