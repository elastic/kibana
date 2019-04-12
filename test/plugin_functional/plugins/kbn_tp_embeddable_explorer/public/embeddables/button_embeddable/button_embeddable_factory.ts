// /*
//  * Licensed to Elasticsearch B.V. under one or more contributor
//  * license agreements. See the NOTICE file distributed with
//  * this work for additional information regarding copyright
//  * ownership. Elasticsearch B.V. licenses this file to you under
//  * the Apache License, Version 2.0 (the "License"); you may
//  * not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *    http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing,
//  * software distributed under the License is distributed on an
//  * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
//  * KIND, either express or implied.  See the License for the
//  * specific language governing permissions and limitations
//  * under the License.
//  */

// import 'ui/doc_table';

// import {
//   embeddableFactories,
//   EmbeddableFactory,
//   EmbeddableInput,
//   EmbeddableOutput,
// } from 'plugins/embeddable_api/index';
// import chrome from 'ui/chrome';
// import { openFlyout } from 'ui/flyout';
// import { User } from '../users_embeddable/users_embeddable_factory';
// import { UserEmbeddable } from './button_embeddable';

// export const USER_EMBEDDABLE = 'USER_EMBEDDABLE';

// export interface UserEmbeddableInput extends EmbeddableInput {
//   username: string;
// }

// export interface UserEmbeddableOutput extends EmbeddableOutput {
//   user?: User;
//   error?: string;
// }

// export class UserEmbeddableFactory extends EmbeddableFactory<
//   UserEmbeddableInput,
//   UserEmbeddableOutput,
//   { username: string; email: string; full_name: string }
// > {
//   constructor() {
//     super({
//       name: USER_EMBEDDABLE,
//     });
//   }

//   public getOutputSpec() {
//     return {};
//   }

//   public async create(initialInput: UserEmbeddableInput) {
//     return Promise.resolve(new UserEmbeddable(initialInput));
//   }
// }

// embeddableFactories.registerFactory(new UserEmbeddableFactory());
