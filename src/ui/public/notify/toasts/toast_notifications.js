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

const normalizeToast = toastOrTitle => {
  if (typeof toastOrTitle === 'string') {
    return {
      title: toastOrTitle,
    };
  }

  return toastOrTitle;
};

export class ToastNotifications {
  constructor() {
    this.list = [];
    this.idCounter = 0;
    this.onChangeCallback = null;
  }

  _changed = () => {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  onChange = callback => {
    this.onChangeCallback = callback;
  };

  add = toastOrTitle => {
    const toast = {
      id: this.idCounter++,
      ...normalizeToast(toastOrTitle),
    };

    this.list.push(toast);
    this._changed();

    return toast;
  };

  remove = toast => {
    const index = this.list.indexOf(toast);

    if (index !== -1) {
      this.list.splice(index, 1);
      this._changed();
    }
  };

  addSuccess = toastOrTitle => {
    return this.add({
      color: 'success',
      iconType: 'check',
      ...normalizeToast(toastOrTitle),
    });
  };

  addWarning = toastOrTitle => {
    return this.add({
      color: 'warning',
      iconType: 'help',
      ...normalizeToast(toastOrTitle),
    });
  };

  addDanger = toastOrTitle => {
    return this.add({
      color: 'danger',
      iconType: 'alert',
      ...normalizeToast(toastOrTitle),
    });
  };
}

export const toastNotifications = new ToastNotifications();
