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
