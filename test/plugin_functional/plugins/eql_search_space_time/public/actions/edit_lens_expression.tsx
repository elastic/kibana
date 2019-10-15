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
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { EditExpressionModal } from './edit_lens_expression_modal';

export const EDIT_LENS_EXPRESSION = 'EDIT_LENS_EXPRESSION';

interface ActionContext {
  embeddable: IEmbeddable;
}

async function isCompatible(context: ActionContext) {
  if (context.embeddable === undefined) {
    return false;
  }
  return context.embeddable.type === 'lens';
}

export function createEditLensExpressionAction(openModal: any): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: EDIT_LENS_EXPRESSION,
    id: EDIT_LENS_EXPRESSION,
    getDisplayName: () => {
      return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
        defaultMessage: 'Edit expression',
      });
    },
    isCompatible,
    execute: async ({ embeddable }: ActionContext) => {
      if (!(await isCompatible({ embeddable }))) {
        throw new IncompatibleActionError();
      }

      const modalSession = openModal(
        <EditExpressionModal onClose={() => modalSession.close()} embeddable={embeddable} />
      );
    },
  });
}
