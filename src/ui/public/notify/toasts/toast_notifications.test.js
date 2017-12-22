import {
  ToastNotifications,
} from './toast_notifications';

describe('ToastNotifications', () => {
  describe('interface', () => {
    let toastNotifications;

    beforeEach(() => {
      toastNotifications = new ToastNotifications();
    });

    describe('add method', () => {
      test('adds a toast', () => {
        toastNotifications.add({});
        expect(toastNotifications.list.length).toBe(1);
      });

      test('adds a toast with an ID property', () => {
        toastNotifications.add({});
        expect(toastNotifications.list[0].id).toBe(0);
      });

      test('increments the toast ID', () => {
        toastNotifications.add({});
        toastNotifications.add({});
        expect(toastNotifications.list[1].id).toBe(1);
      });
    });

    describe('remove method', () => {
      test('removes a toast', () => {
        const toast = {};
        toastNotifications.add(toast);
        toastNotifications.remove(toast);
        expect(toastNotifications.list.length).toBe(0);
      });
    });
  });
});
