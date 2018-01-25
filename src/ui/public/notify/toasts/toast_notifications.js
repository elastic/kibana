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
  }

  add = toastOrTitle => {
    this.list.push({
      id: this.idCounter++,
      ...normalizeToast(toastOrTitle),
    });
  };

  remove = toast => {
    const index = this.list.indexOf(toast);
    this.list.splice(index, 1);
  };

  addSuccess = toastOrTitle => {
    this.add({
      color: 'success',
      iconType: 'check',
      ...normalizeToast(toastOrTitle),
    });
  };

  addWarning = toastOrTitle => {
    this.add({
      color: 'warning',
      iconType: 'help',
      ...normalizeToast(toastOrTitle),
    });
  };

  addDanger = toastOrTitle => {
    this.add({
      color: 'danger',
      iconType: 'alert',
      ...normalizeToast(toastOrTitle),
    });
  };
}

export const toastNotifications = new ToastNotifications();
