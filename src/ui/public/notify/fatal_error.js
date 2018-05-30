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

import _ from 'lodash';
import $ from 'jquery';
import { metadata } from '../metadata';
import { formatMsg, formatStack } from './lib';
import fatalSplashScreen from './partials/fatal_splash_screen.html';
import { callEach } from '../utils/function';

const {
  version,
  buildNum,
} = metadata;

// used to identify the first call to fatal, set to false there
let firstFatal = true;

const fatalToastTemplate = (function lazyTemplate(tmpl) {
  let compiled;
  return function (vars) {
    return (compiled || (compiled = _.template(tmpl)))(vars);
  };
}(require('./partials/fatal.html')));

// to be notified when the first fatal error occurs, push a function into this array.
const fatalCallbacks = [];

export const addFatalErrorCallback = callback => {
  fatalCallbacks.push(callback);
};

function formatInfo() {
  const info = [];

  if (!_.isUndefined(version)) {
    info.push(`Version: ${version}`);
  }

  if (!_.isUndefined(buildNum)) {
    info.push(`Build: ${buildNum}`);
  }

  return info.join('\n');
}

// We're exporting this because state_management/state.js calls fatalError, which makes it
// impossible to test unless we stub this stuff out.
export const fatalErrorInternals = {
  show: (err, location) => {
    if (firstFatal) {
      callEach(fatalCallbacks);
      firstFatal = false;
      window.addEventListener('hashchange', function () {
        window.location.reload();
      });
    }

    const html = fatalToastTemplate({
      info: formatInfo(),
      msg: formatMsg(err, location),
      stack: formatStack(err)
    });

    let $container = $('#fatal-splash-screen');

    if (!$container.length) {
      $(document.body)
        // in case the app has not completed boot
        .removeAttr('ng-cloak')
        .html(fatalSplashScreen);

      $container = $('#fatal-splash-screen');
    }

    $container.append(html);
  },
};

/**
 * Kill the page, display an error, then throw the error.
 * Used as a last-resort error back in many promise chains
 * so it rethrows the error that's displayed on the page.
 *
 * @param  {Error} err - The error that occured
 */
export function fatalError(err, location) {
  fatalErrorInternals.show(err, location);
  console.error(err.stack); // eslint-disable-line no-console

  throw err;
}
