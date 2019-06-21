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

var readFileSync = require('fs').readFileSync;
let { agentJsFilename } = require('@percy/agent/dist/utils/sdk-utils');

export function takePercySnapshot() {
  if (!window.PercyAgent) {
    return false;
  }

  var agent = new window.PercyAgent({
    handleAgentCommunication: false
  });

  function canvasToImage(selectorOrEl) {
    let canvas = typeof selectorOrEl === "object" ? selectorOrEl : document.querySelector(selector);
    let image = document.createElement('img');
    let canvasImageBase64 = canvas.toDataURL();

    image.src = canvasImageBase64;
    image.style = "max-width: 100%";
    canvas.setAttribute('data-percy-modified', true);
    canvas.parentElement.appendChild(image);
    canvas.style = 'display: none';
  }
  
  window.document.querySelector('canvas').forEach(selector => canvasToImage(selector));

  return agent.domSnapshot(window.document);
}

export var takePercySnapshotWithAgent = `
  ${readFileSync(agentJsFilename(), 'utf8')}

  return (${takePercySnapshot.toString()})();
`;
