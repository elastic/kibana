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

import { readFileSync } from 'fs';
import { agentJsFilename } from '@percy/agent/dist/utils/sdk-utils';

export function takePercySnapshot(show, hide) {
  if (!window.PercyAgent) {
    return false;
  }

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

  const agent = new window.PercyAgent({
    handleAgentCommunication: false
  });

  // set Percy visibility on elements
  add(hide, 'hideInPercy');
  if (show.length > 0) {
    // hide the body by default
    add(['body'], 'hideInPercy');
    add(show, 'showInPercy');
  }

  try {
    // array of canvas/image replacements
    const replacements = [];

    // convert canvas elements into static images
    for (const canvas of document.querySelectorAll('canvas')) {
      const image = document.createElement('img');
      image.classList.value = canvas.classList.value;
      image.src = canvas.toDataURL();
      image.style.cssText = window.getComputedStyle(canvas).cssText;
      canvas.parentElement.replaceChild(image, canvas);
      replacements.push({ canvas, image });
    }

    // cache the dom snapshot containing the images
    const snapshot = agent.snapshot(document, {
      widths: [document.documentElement.clientWidth]
    });

    // restore replaced canvases
    for (const { image, canvas } of replacements) {
      image.parentElement.replaceChild(canvas, image);
    }

    return snapshot;
  } finally {
    // restore element visibility
    remove(['body'], 'hideInPercy');
    remove(show, 'showInPercy');
    remove(hide, 'hideInPercy');
  }
}

export const takePercySnapshotWithAgent = `
  ${readFileSync(agentJsFilename(), 'utf8')}

  return (${takePercySnapshot.toString()}).apply(null, arguments);
`;
