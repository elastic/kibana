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
import { SavedObjectsClient } from 'kibana/public';
import {
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { CreateLensVisualizationModal } from './create_lens_visualization_modal';

export const CREATE_LENS_VIS = 'CREATE_LENS_VIS';

interface ActionContext {
  embeddable: IEmbeddable;
}

async function isCompatible(context: ActionContext) {
  if (context.embeddable === undefined) {
    return false;
  }
  return true;
}

export function createLensVisualizationAction(
  openModal: any,
  savedObjectClient: SavedObjectsClient
): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: CREATE_LENS_VIS,
    id: CREATE_LENS_VIS,
    getDisplayName: () => {
      return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
        defaultMessage: 'Create visualization',
      });
    },
    isCompatible,
    execute: async ({ embeddable }: ActionContext) => {
      if (!(await isCompatible({ embeddable }))) {
        throw new IncompatibleActionError();
      }

      const modalSession = openModal(
        <CreateLensVisualizationModal
          onClose={() => modalSession.close()}
          embeddable={embeddable}
          savedObjectClient={savedObjectClient}
        />
      );
    },
  });
}
