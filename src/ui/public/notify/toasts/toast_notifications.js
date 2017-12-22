let toastCounter = 0;

class ToastNotifications {
  constructor() {
    this.list = [];
  }

  add = toast => {
    this.list.push({
      id: toastCounter++,
      ...toast
    });
  };

  remove = toast => {
    const index = this.list.indexOf(toast);
    this.list.splice(index, 1);
  };
}

export const toastNotifications = new ToastNotifications();
