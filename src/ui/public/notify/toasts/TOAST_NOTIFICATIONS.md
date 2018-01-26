# Toast notifications

Use this service to surface toasts in the bottom-right corner of the screen. After a brief delay, they'll disappear. They're useful for notifying the user of state changes. See [the EUI docs](elastic.github.io/eui/) for more information on toasts and their role within the UI.

## Importing the module

```js
import { toastNotifications } from 'ui/notify';
```

## Adding a toast

The simplest way to display a toast is to call `add` and pass in a string. This will display the string as the title of the toast, and give the toast a neutral appearance.

```js
toastNotifications.add('Saved document');
```

You can provide an object to configure the toast further. The properties of this object correspond to the `propTypes` accepted by the `EuiToast` component. Refer to [the EUI docs](elastic.github.io/eui/) for info on these `propTypes`.

```js
toastNotifications.add({
  title: 'Saved document',
  text: 'Only you have access to this document',
  color: 'success',
  iconType: 'check',
  'data-test-subj': 'saveDocumentSuccess',
});
```

Because the underlying components are React, you can use JSX to pass in React elements to the `text` prop. This gives you total flexibility over the content displayed within the toast.

```js
toastNotifications.add({
  title: 'Saved document',
  text: (
    <div>
      <p>
        Only you have access to this document. <a href="/documents">Edit permissions.</a>
      </p>

      <button onClick={() => deleteDocument()}}>
        Delete document
      </button>
    </div>
  ),
});
```

## Adding different types of toasts

For convenience, there are several methods which predefine the appearance of different types of toasts. Use these methods so that the same types of toasts look similar to the user.

Let the user know that an action was successful, such as saving or deleting an object.

```js
toastNotifications.addSuccess('Saved document');
```

If something OK or good happened, but perhaps wasn't perfect, show a warning toast.

```js
toastNotifications.addWarning('Saved document, but not edit history');
```

When the user initiated an action but the action failed, show them a danger toast.

```js
toastNotifications.addDanger('An error caused your document to be lost');
```

## Removing a toast

Toasts will automatically be dismissed after a brief delay, but if for some reason you want to dismiss a toast, you can use the returned toast from one of the `add` methods and then pass it to `remove`.

```js
const toast = toastNotifications.add('Saved document');
toastNotifications.remove(toast);
```

## Use in functional tests

Functional tests are commonly used to verify that a user action yielded a sucessful outcome. if you surface a toast to notify the user of this successful outcome, you can place a `data-test-subj` attribute on the toast and use it to check if the toast exists inside of your functional test. This acts as a proxy for verifying the sucessful outcome.

```js
toastNotifications.addSuccess({
  title: 'Saved document',
  'data-test-subj': 'saveDocumentSuccess',
});
```