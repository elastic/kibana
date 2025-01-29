/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { camelCase } from 'lodash';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import { useNotifyService } from '../../services';
// @ts-expect-error untyped local
import { selectToplevelNodes } from '../../state/actions/transient';
// @ts-expect-error untyped local
import { insertNodes } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../lib/ui_metric';
import {
  SavedElementsModal as Component,
  Props as ComponentProps,
} from './saved_elements_modal.component';
import { PositionedElement, CustomElement } from '../../../types';
import { getCustomElementService } from '../../services/canvas_custom_element_service';

const customElementAdded = 'elements-custom-added';

export type Props = Pick<ComponentProps, 'onClose'>;

export const SavedElementsModal = ({ onClose }: Props) => {
  const notifyService = useNotifyService();
  const customElementService = useMemo(() => getCustomElementService(), []);
  const dispatch = useDispatch();
  const pageId = useSelector(getSelectedPage);
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);

  const onSearch = async (search = '') => {
    try {
      const { customElements: foundElements } = await customElementService.find(search);
      setCustomElements(foundElements);
    } catch (err) {
      notifyService.error(err, {
        title: `Couldn't find custom elements`,
      });
    }
  };

  const onAddCustomElement = (customElement: CustomElement) => {
    const { selectedNodes = [] } = JSON.parse(customElement.content) || {};
    const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);

    if (clonedNodes) {
      dispatch(insertNodes(clonedNodes, pageId)); // first clone and persist the new node(s)
      dispatch(
        selectToplevelNodes(
          clonedNodes
            .filter((e: PositionedElement): boolean => !e.position.parent)
            .map((e: PositionedElement): string => e.id)
        )
      ); // then select the cloned node(s)
    }

    onClose();
    trackCanvasUiMetric(METRIC_TYPE.LOADED, customElementAdded);
  };

  const onRemoveCustomElement = async (id: string) => {
    try {
      await customElementService.remove(id);
      await onSearch();
    } catch (err) {
      notifyService.error(err, {
        title: `Couldn't delete custom elements`,
      });
    }
  };

  const onUpdateCustomElement = async (
    id: string,
    name: string,
    description: string,
    image: string
  ) => {
    try {
      await customElementService.update(id, {
        name: camelCase(name),
        displayName: name,
        image,
        help: description,
      });
      await onSearch();
    } catch (err) {
      notifyService.error(err, {
        title: `Couldn't update custom elements`,
      });
    }
  };

  return (
    <Component
      {...{
        onAddCustomElement,
        onClose,
        onRemoveCustomElement,
        onSearch,
        onUpdateCustomElement,
        customElements,
      }}
    />
  );
};
