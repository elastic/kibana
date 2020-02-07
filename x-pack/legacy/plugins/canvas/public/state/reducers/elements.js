/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import * as actions from '../actions/elements';

const { assign, push, del, set } = immutable;

const getLocation = type => (type === 'group' ? 'groups' : 'elements');
const firstOccurrence = (element, index, array) => array.indexOf(element) === index;

const getLocationFromIds = (workpadState, pageId, nodeId) => {
  const page = workpadState.pages.find(p => p.id === pageId);
  const groups = page == null ? [] : page.groups || [];
  return groups.find(e => e.id === nodeId) ? 'groups' : 'elements';
};

function getPageIndexById(workpadState, pageId) {
  return get(workpadState, 'pages', []).findIndex(page => page.id === pageId);
}

function getNodeIndexById(page, nodeId, location) {
  return page[location].findIndex(node => node.id === nodeId);
}

export function assignNodeProperties(workpadState, pageId, nodeId, props) {
  const pageIndex = getPageIndexById(workpadState, pageId);
  const location = getLocationFromIds(workpadState, pageId, nodeId);
  const nodesPath = `pages.${pageIndex}.${location}`;
  const nodeIndex = get(workpadState, nodesPath, []).findIndex(node => node.id === nodeId);

  if (pageIndex === -1 || nodeIndex === -1) {
    return workpadState;
  }

  return assign(workpadState, `${nodesPath}.${nodeIndex}`, props);
}

function moveNodeLayer(workpadState, pageId, nodeId, movement, location) {
  const pageIndex = getPageIndexById(workpadState, pageId);
  const nodeIndex = getNodeIndexById(workpadState.pages[pageIndex], nodeId, location);
  const nodes = get(workpadState, ['pages', pageIndex, location]);
  const from = nodeIndex;

  const to = (function() {
    if (movement < Infinity && movement > -Infinity) {
      return nodeIndex + movement;
    }
    if (movement === Infinity) {
      return nodes.length - 1;
    }
    if (movement === -Infinity) {
      return 0;
    }
    throw new Error('Invalid element layer movement');
  })();

  if (to > nodes.length - 1 || to < 0) {
    return workpadState;
  }

  // Common
  const newNodes = nodes.slice(0);
  newNodes.splice(to, 0, newNodes.splice(from, 1)[0]);

  return set(workpadState, `pages.${pageIndex}.${location}`, newNodes);
}

const trimPosition = ({ left, top, width, height, angle, parent }) => ({
  left,
  top,
  width,
  height,
  angle,
  parent,
});

const trimElement = ({ id, position, expression, filter }) => ({
  id,
  position: trimPosition(position),
  ...(position.type !== 'group' && { expression }),
  ...(filter !== void 0 && { filter }),
});

const getPageWithElementId = (workpad, elementId) => {
  const matchingPage = workpad.pages.find(page =>
    page.elements.map(element => element.id).includes(elementId)
  );

  if (matchingPage) {
    return matchingPage.id;
  }

  return undefined;
};

export const elementsReducer = handleActions(
  {
    // TODO: This takes the entire element, which is not necessary, it could just take the id.
    [actions.setExpression]: (workpadState, { payload }) => {
      const { expression, pageId, elementId } = payload;
      return assignNodeProperties(workpadState, pageId, elementId, { expression });
    },
    [actions.setFilter]: (workpadState, { payload }) => {
      const { filter, elementId } = payload;
      const pageId = getPageWithElementId(workpadState, elementId);
      return assignNodeProperties(workpadState, pageId, elementId, { filter });
    },
    [actions.setMultiplePositions]: (workpadState, { payload }) =>
      payload.repositionedElements.reduce(
        (previousWorkpadState, { position, pageId, elementId }) =>
          assignNodeProperties(previousWorkpadState, pageId, elementId, {
            position: trimPosition(position),
          }),
        workpadState
      ),
    [actions.elementLayer]: (workpadState, { payload: { pageId, elementId, movement } }) => {
      const location = getLocationFromIds(workpadState, pageId, elementId);
      return moveNodeLayer(workpadState, pageId, elementId, movement, location);
    },
    [actions.addElement]: (workpadState, { payload: { pageId, element } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) {
        return workpadState;
      }
      if (
        // don't add a group that is already persisted
        workpadState.pages[pageIndex][getLocation(element.position.type)].find(
          e => e.id === element.id
        )
      ) {
        return workpadState;
      }
      return push(
        workpadState,
        `pages.${pageIndex}.${getLocation(element.position.type)}`,
        trimElement(element)
      );
    },
    [actions.insertNodes]: (workpadState, { payload: { pageId, elements } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) {
        return workpadState;
      }
      return elements.reduce(
        (state, element) =>
          push(
            state,
            `pages.${pageIndex}.${getLocation(element.position.type)}`,
            trimElement(element)
          ),
        workpadState
      );
    },
    [actions.removeElements]: (workpadState, { payload: { pageId, elementIds } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) {
        return workpadState;
      }

      const nodeIndices = elementIds
        .filter(firstOccurrence)
        .map(nodeId => {
          const location = getLocationFromIds(workpadState, pageId, nodeId);
          return {
            location,
            index: getNodeIndexById(workpadState.pages[pageIndex], nodeId, location),
          };
        })
        .sort((a, b) => b.index - a.index); // deleting from end toward beginning, otherwise indices will become off - todo fuse loops!

      return nodeIndices.reduce((state, { location, index }) => {
        return del(state, `pages.${pageIndex}.${location}.${index}`);
      }, workpadState);
    },
  },
  {}
);
