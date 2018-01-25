export class ToastNotifications {
  constructor() {
    this.list = [];
    this.idCounter = 0;
  }

  add = toast => {
    this.list.push({
      id: this.idCounter++,
      ...toast
    });
  };

  remove = toast => {
    const index = this.list.indexOf(toast);
    this.list.splice(index, 1);
  };

  addSuccess = toast => {
    this.add({
      color: 'success',
      iconType: 'check',
      ...toast,
    });
  };

  addWarning = toast => {
    this.add({
      color: 'warning',
      iconType: 'help',
      ...toast,
    });
  };

  addDanger = toast => {
    this.add({
      color: 'danger',
      iconType: 'alert',
      ...toast,
    });
  };
}

export const toastNotifications = new ToastNotifications();
