/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { camelCase } from 'lodash';
// @ts-ignore Untyped local
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import * as customElementService from '../../lib/custom_element_service';
// @ts-ignore Untyped local
import { notify } from '../../lib/notify';
// @ts-ignore Untyped local
import { selectToplevelNodes } from '../../state/actions/transient';
// @ts-ignore Untyped local
import { insertNodes } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../lib/ui_metric';
import { SavedElementsModal as Component, Props as ComponentProps } from './saved_elements_modal';
import { State, PositionedElement, CustomElement } from '../../../types';

const customElementAdded = 'elements-custom-added';

interface OwnProps {
  onClose: () => void;
}

interface DispatchProps {
  selectToplevelNodes: (nodes: PositionedElement[]) => void;
  insertNodes: (selectedNodes: PositionedElement[], pageId: string) => void;
}

interface StateProps {
  pageId: string;
}

const mapStateToProps = (state: State): StateProps => ({
  pageId: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  selectToplevelNodes: (nodes: PositionedElement[]) =>
    dispatch(
      selectToplevelNodes(
        nodes
          .filter((e: PositionedElement): boolean => !e.position.parent)
          .map((e: PositionedElement): string => e.id)
      )
    ),
  insertNodes: (selectedNodes: PositionedElement[], pageId: string) =>
    dispatch(insertNodes(selectedNodes, pageId)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: OwnProps
): ComponentProps => {
  const { pageId } = stateProps;
  const { onClose } = ownProps;

  return {
    onClose,
    // add custom element to the page
    addCustomElement: (customElement: CustomElement) => {
      const { selectedNodes = [] } = JSON.parse(customElement.content) || {};
      const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
      if (clonedNodes) {
        dispatchProps.insertNodes(clonedNodes, pageId); // first clone and persist the new node(s)
        dispatchProps.selectToplevelNodes(clonedNodes); // then select the cloned node(s)
      }
      onClose();
      trackCanvasUiMetric(METRIC_TYPE.LOADED, customElementAdded);
    },
    // custom element search
    findCustomElements: async (text: string): Promise<CustomElement[]> => {
      try {
        const { customElements } = await customElementService.find(text);
        return customElements;
      } catch (err) {
        notify.error(err, { title: `Couldn't find custom elements` });
        return [];
      }
    },
    // remove custom element
    removeCustomElement: async (id: string) => {
      try {
        await customElementService.remove(id);
      } catch (err) {
        notify.error(err, { title: `Couldn't delete custom elements` });
      }
    },
    // update custom element
    updateCustomElement: async (id: string, name: string, description: string, image: string) => {
      try {
        await customElementService.update(id, {
          name: camelCase(name),
          displayName: name,
          image,
          help: description,
        });
      } catch (err) {
        notify.error(err, { title: `Couldn't update custom elements` });
      }
    },
  };
};

export const SavedElementsModal = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Component);
