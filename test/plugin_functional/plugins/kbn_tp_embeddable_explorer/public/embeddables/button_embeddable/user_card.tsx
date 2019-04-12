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
// // @ts-ignore
// import {
//   EuiButton,
//   EuiCallOut,
//   EuiCard,
//   EuiFieldText,
//   EuiFlexItem,
//   EuiFormRow,
//   EuiLink,
//   EuiSpacer,
//   EuiText,
// } from '@elastic/eui';
// import { executeTriggerActions, getActionsForTrigger } from 'plugins/embeddable_api/index';
// import React from 'react';
// import { User } from '../users_embeddable/users_embeddable_factory';
// import { EMAIL_USER_TRIGGER, UserEmbeddable, VIEW_USER_TRIGGER } from './button_embeddable';

// interface Props {
//   embeddable: UserEmbeddable;
// }

// interface State {
//   user?: User;
//   error?: string;
//   viewActionIsConfigured: boolean;
//   emailActionIsConfigured: boolean;
//   username?: string;
// }

// export class UserCard extends React.Component<Props, State> {
//   private mounted = false;
//   private unsubscribe?: () => void;

//   constructor(props: Props) {
//     super(props);
//     const { user, error } = props.embeddable.getOutput();
//     this.state = {
//       user,
//       username: props.embeddable.getInput().username,
//       error,
//       viewActionIsConfigured: false,
//       emailActionIsConfigured: false,
//     };
//   }

//   public renderCardFooterContent() {
//     return (
//       <div>
//         <EuiButton onClick={() => this.onView()}>View</EuiButton>
//         <EuiSpacer size="xs" />
//         <EuiText size="s">
//           <p>
//             <EuiLink onClick={() => this.onEmail()}>Email</EuiLink>
//           </p>
//         </EuiText>
//       </div>
//     );
//   }

//   public async componentDidMount() {
//     this.mounted = true;
//     this.unsubscribe = this.props.embeddable.subscribeToOutputChanges(() => {
//       if (this.mounted) {
//         const { user, error } = this.props.embeddable.getOutput();
//         this.setState({ user, error });
//       }
//     });

//     const viewActions = await getActionsForTrigger(VIEW_USER_TRIGGER, {
//       embeddable: this.props.embeddable,
//     });

//     const emailActions = await getActionsForTrigger(EMAIL_USER_TRIGGER, {
//       embeddable: this.props.embeddable,
//     });

//     if (this.mounted) {
//       this.setState({
//         emailActionIsConfigured: emailActions.length > 0,
//         viewActionIsConfigured: viewActions.length > 0,
//       });
//     }
//   }

//   public componentWillUnmount() {
//     if (this.unsubscribe) {
//       this.unsubscribe();
//     }
//     this.mounted = false;
//   }

//   public changeUser = () => {
//     if (this.state.username) {
//       this.props.embeddable.setInput({
//         ...this.props.embeddable.getInput(),
//         username: this.state.username,
//       });
//     }
//   };

//   public render() {
//     return (
//       <EuiFlexItem key={this.props.embeddable.id}>
//         {this.state.user ? (
//           <EuiCard
//             title={this.state.username}
//             description={this.state.user.name}
//             footer={this.renderCardFooterContent()}
//           />
//         ) : (
//           <EuiCallOut color="danger">
//             Error:{this.state.error ? this.state.error.message : ''}
//             <EuiFormRow>
//               <EuiFieldText onChange={e => this.setState({ username: e.target.value })} />
//             </EuiFormRow>
//             <EuiButton onClick={this.changeUser}>Change user</EuiButton>
//           </EuiCallOut>
//         )}
//       </EuiFlexItem>
//     );
//   }

//   private onView = () => {
//     executeTriggerActions(VIEW_USER_TRIGGER, {
//       embeddable: this.props.embeddable,
//       triggerContext: {},
//     });
//   };

//   private onEmail = () => {
//     executeTriggerActions(EMAIL_USER_TRIGGER, {
//       embeddable: this.props.embeddable,
//       triggerContext: {},
//     });
//   };
// }
