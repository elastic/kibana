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

import { npStart } from '../../../../../src/legacy/ui/public/new_platform';
import { start } from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  HelloWorldAction,
  SayHelloAction,
  SendMessageAction,
  HelloWorldEmbeddableFactory,
  ContactCardEmbeddableFactory,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/test_samples';

import { Plugin as EmbeddableExplorer } from './plugin';
import { createShim } from './shim';

const helloWorldAction = new HelloWorldAction(npStart.core.overlays);
const sayHelloAction = new SayHelloAction(alert);
const sendMessageAction = new SendMessageAction(npStart.core.overlays);
const helloWorldEmbeddableFactory = new HelloWorldEmbeddableFactory();
const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
  {},
  start.executeTriggerActions,
  npStart.core.overlays
);

start.registerAction(helloWorldAction);
start.registerAction(sayHelloAction);
start.registerAction(sendMessageAction);
start.registerEmbeddableFactory(helloWorldEmbeddableFactory.type, helloWorldEmbeddableFactory);
start.registerEmbeddableFactory(contactCardEmbeddableFactory.type, contactCardEmbeddableFactory);

const embeddableExplorer = new EmbeddableExplorer();
embeddableExplorer.start(createShim());
