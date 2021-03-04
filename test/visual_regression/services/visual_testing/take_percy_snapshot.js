/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { agentJsFilename } from '@percy/agent/dist/utils/sdk-utils';

export function takePercySnapshot(show, hide) {
  if (!window.PercyAgent) {
    return false;
  }

  // add percy styles to hide/show specific elements
  const styleElement = document.createElement('style');
  styleElement.appendChild(
    document.createTextNode(`
    .hideInPercy {
      visibility: hidden;

      .showInPercy {
        visibility: visible;
      }
    }

    .showInPercy {
      visibility: visible;

      .hideInPercy {
        visibility: hidden;
      }
    }
  `)
  );
  document.head.appendChild(styleElement);

  const add = (selectors, className) => {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.classList.add(className);
      }
    }
  };

  const remove = (selectors, className) => {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.classList.remove(className);
      }
    }
  };

  // set Percy visibility on elements
  add(hide, 'hideInPercy');
  if (show.length > 0) {
    // hide the body by default
    add(['body'], 'hideInPercy');
    add(show, 'showInPercy');
  }

  // convert canvas elements into static images
  const replacements = [];
  for (const canvas of document.querySelectorAll('canvas')) {
    const image = document.createElement('img');
    image.classList.value = canvas.classList.value;
    image.src = canvas.toDataURL();
    image.style.cssText = window.getComputedStyle(canvas).cssText;
    canvas.parentElement.replaceChild(image, canvas);
    replacements.push({ canvas, image });
  }

  try {
    const agent = new window.PercyAgent({
      handleAgentCommunication: false,
    });

    // cache the dom snapshot containing the images
    return agent.snapshot(document, {
      widths: [document.documentElement.clientWidth],
    });
  } finally {
    // restore replaced canvases
    for (const { image, canvas } of replacements) {
      image.parentElement.replaceChild(canvas, image);
    }

    // restore element visibility
    document.head.removeChild(styleElement);
    remove(['body'], 'hideInPercy');
    remove(show, 'showInPercy');
    remove(hide, 'hideInPercy');
  }
}

export const takePercySnapshotWithAgent = `
  ${readFileSync(agentJsFilename(), 'utf8')}

  return (${takePercySnapshot.toString()}).apply(null, arguments);
`;
