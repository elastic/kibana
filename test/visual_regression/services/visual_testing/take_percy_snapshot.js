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
