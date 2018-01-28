# Banners

Use this service to surface banners at the top of the screen. The expectation is that the banner will used an
`<EuiCallOut />` to render, but that is not a requirement. See [the EUI docs](elastic.github.io/eui/) for more information on toasts and their role within the UI.

## Importing the module

```js
import { topBanners } from 'ui/notify';
```

## Interface

### Adding banners

There are only two methods defined to manipulate the list of banners: `add` and `remove`. All banners must be added with an `id` field so that they can be removed.

#### `set`

To add a banner, you only need to define an `id` and a `component`. If the `id` already exists, then it replaces the
existing banner. If the `id` does not exist, then an optional `priority` controls where the banner is placed, which uses an descending order (highest first) for sorting.

This example includes buttons that allow the user to remove the banner. In some cases, you may not want any buttons
and in other cases you will want an action to proceed the banner's removal (e.g., apply an Advanced Setting).

```js
topBanners.set({
  id: 'my-banner',
  component: (
    <EuiCallOut
      iconType="iInCircle"
      title="In order to visualize and explore data in Kibana, you'll need to create an index pattern to retrieve data from Elasticsearch."
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiButton
            size="s"
            fill
            onClick={() => topBanners.remove('my-banner')}
          >
            Dismiss
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiButton
            size="s"
            onClick={() => window.alert('Do Something Else')}
          >
            Do Something Else
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  ),
});
```

### Removing

Unlike toast notifications, banners stick around until they are explicitly removed. Using the example above, you can
remove it by calling `remove`.

Note: They will stick around as long as the scope is remembered by whatever set it; navigating away won't remove it
unless the scope is forgotten (e.g., when the "app" changes)!

#### `remove`

To remove a banner, you need to pass the `id` of the banner.

```js
if (topBanners.remove('my-banner')) {
  // removed; otherwise it didn't exist (maybe it was already removed)
}
```

Note: It is safe to remove a banner more than once. Calls to remove unknown banner IDs return `false`.

##### Scheduled removal

Like toast notifications do automatically, you can have a banner automatically removed after a set of time, by setting
a timer:

```js
setTimeout(() => topBanners.remove('my-banner'), 15000);
```

### Configuration options

The only configuration option for banners is to control its location in the list. To do that, you set a numeric
`priority`, which is sorted in ascending order. If not specified, then the default priority is `0`. Items sharing the
same priority are sorted from oldest to newest. For example:

```js
topBanners.set({ id: 'fake1', component: <EuiCallOut title="fake1" /> });
topBanners.set({ id: 'fake2', component: <EuiCallOut title="fake2" />, priority: 0 });
topBanners.set({ id: 'fake3', component: <EuiCallOut title="fake3" />, priority: 1 });
```

That example would be displayed as:

```
[ fake3 ]
[ fake1 ]
[ fake2 ]
```

## Use in functional tests

Functional tests are commonly used to verify that an action yielded a sucessful outcome. You can place a
`data-test-subj` attribute on the banner and use it to check if the banner exists inside of your functional test.
This acts as a proxy for verifying the sucessful outcome. Any unrecognized field will be added as a property of the
containing element.

```js
topBanners.set({
  id: 'my-tested-banner'
  component: (
    <EuiCallOut
      title="Look at me!"
    />
  ),
  data-test-subj: 'my-tested-banner',
});
```

This will apply the `data-test-subj` to the element containing the `component`, so the inner HTML of that element
will exclusively be the specified `component`.

Given that `component` is expected to be a React component, you could also add the `data-test-subj` directly to it:

```js
topBanners.set({
  id: 'my-tested-banner'
  component: (
    <EuiCallOut
      title="Look at me!"
      data-test-subj="my-tested-banner"
    />
  ),
});
```