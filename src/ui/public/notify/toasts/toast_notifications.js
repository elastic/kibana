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
}

export const toastNotifications = new ToastNotifications();
