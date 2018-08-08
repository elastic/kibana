# Banners

Use this service to surface banners at the top of the screen. The expectation is that the banner will used an
`<EuiCallOut />` to render, but that is not a requirement. See [the EUI docs](https://elastic.github.io/eui/) for
more information on banners and their role within the UI.

Banners should be considered with respect to their lifecycle. Most banners are best served by using the `add` and
`remove` functions.

## Importing the module

```js
import { banners } from 'ui/notify';
```

## Interface

There are three methods defined to manipulate the list of banners: `add`, `set`, and `remove`. A fourth method,
`onChange` exists to listen to changes made via `add`, `set`, and `remove`.

### `add()`

This is the preferred way to add banners because it implies the best usage of the banner: added once during a page's
lifecycle. For other usages, consider *not* using a banner.

#### Syntax

```js
const bannerId = banners.add({
  // required:
  component,
  // optional:
  priority,
});
```

##### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `component` | Any | The value displayed as the banner. |
| `priority` | Number | Optional priority, which defaults to `0` used to place the banner. |

To add a banner, you only need to define the `component` field.

The `priority` sorts in descending order. Items sharing the same priority are sorted from oldest to newest. For example:

```js
const banner1 = banners.add({ component: <EuiCallOut title="fake1" /> });
const banner2 = banners.add({ component: <EuiCallOut title="fake2" />, priority: 0 });
const banner3 = banners.add({ component: <EuiCallOut title="fake3" />, priority: 1 });
```

That would be displayed as:

```
[ fake3 ]
[ fake1 ]
[ fake2 ]
```

##### Returns

| Type | Description |
|------|-------------|
| String | A newly generated ID. |

#### Example

This example includes buttons that allow the user to remove the banner. In some cases, you may not want any buttons
and in other cases you will want an action to proceed the banner's removal (e.g., apply an Advanced Setting).

This makes the most sense to use when a banner is added at the beginning of the page life cycle and not expected to
be touched, except by its own buttons triggering an action or navigating away.

```js
const bannerId = banners.add({
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
            onClick={() => banners.remove(bannerId)}
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

### `remove()`

Unlike toast notifications, banners stick around until they are explicitly removed. Using the `add` example above,you can remove it by calling `remove`.

Note: They will stick around as long as the scope is remembered by whatever set it; navigating away won't remove it
unless the scope is forgotten (e.g., when the "app" changes)!

#### Syntax

```js
const removed = banners.remove(bannerId);
```

##### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id`  | String | ID of a banner. |

##### Returns

| Type | Description |
|------|-------------|
| Boolean | `true` if the ID was recognized and the banner was removed. `false` otherwise. |

#### Example

To remove a banner, you need to pass the `id` of the banner.

```js
if (banners.remove(bannerId)) {
  // removed; otherwise it didn't exist (maybe it was already removed)
}
```

#### Scheduled removal

Like toast notifications do automatically, you can have a banner automatically removed after a set of time, by
setting a timer:

```js
setTimeout(() => banners.remove(bannerId), 15000);
```

Note: It is safe to remove a banner more than once as unknown IDs will be ignored.

### `set()`

Banners can be replaced once added by supplying their `id`. If one is supplied, then the ID will be used to replace
any banner with the same ID and a **new** `id` will be returned.

You should only consider using `set` when the banner is manipulated frequently in the lifecycle of the page, where
maintaining the banner's `id` can be a burden. It is easier to allow `banners` to create the ID for you in most
situations where a banner is useful (e.g., set once), which safely avoids any chance to have an ID-based collision,
which happens automatically with `add`.

Usage of `set` can imply that your use case is abusing the banner system.

Note: `set` will only trigger the callback once for both the implicit remove and add operation.

#### Syntax

```js
const id = banners.set({
  // required:
  component,
  // optional:
  id,
  priority,
});
```

##### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `component` | Any | The value displayed as the banner. |
| `id`  | String | Optional ID used to remove an existing banner. |
| `priority` | Number | Optional priority, which defaults to `0` used to place the banner. |

The `id` is optional because it follows the same semantics as the `remove` method: unknown IDs are ignored. This
is useful when first creating a banner so that you do not have to call `add` instead.

##### Returns

| Type | Description |
|------|-------------|
| String | A newly generated ID. |

#### Example

This example does not include any way for the user to clear the banner directly. Instead, it is cleared based on
time. Related to it being cleared by time, it can also reappear within the same page life cycle by navigating between
different paths that need it displayed. Instead of adding a new banner for every navigation, you should replace any
existing banner.

```js
let bannerId;
let timeoutId;

function displayBanner() {
  clearTimeout(timeoutId);

  bannerId = banners.set({
    id: bannerId, // the first time it will be undefined, but reused as long as this is in the same lifecycle
    component: (
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title={
          `In order to visualize and explore data in Kibana,
          you'll need to create an index pattern to retrieve data from Elasticsearch.`
        }
      />
    )
  });

  // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
  banner.timeoutId = setTimeout(() => {
    banners.remove(bannerId);
    timeoutId = undefined;
  }, 6000);
}
```

### `onChange()`

For React components that intend to display the banners, it is not enough to simply `render` the `banners.list`
values. Because they can change after being rendered, the React component that renders the list must be alerted
to changes to the list.

#### Syntax

```js
// inside your React component
banners.onChange(() => this.forceUpdate());
```

##### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `callback` | Function | The function to invoke whenever the internal banner list is changed. |

Every new `callback` replaces the previous callback. So calling this with `null` or `undefined` will unset the
callback.

##### Returns

Nothing.

#### Example

This can be used inside of a React component to trigger a re-`render` of the banners.

```js
import { GlobalBannerList } from 'ui/notify';

<GlobalBannerList
  banners={banners.list}
  subscribe={banners.onChange}
/>
```

### `list`

For React components that intend to display the banners, it is not enough to simply `render` the `banners.list`
values. Because they can change after being rendered, the React component that renders the list must be alerted
to changes to the list.

#### Syntax

```js
<GlobalBannerList
  banners={banners.list}
  subscribe={banners.onChange}
/>
```

##### Returns

| Type | Description |
|------|-------------|
| Array | The array of banner objects. |

Banner objects are sorted in descending order based on their `priority`, in the form:

```js
{
  id: 'banner-123',
  component: <EuiCallOut />,
  priority: 12,
}
```

| Field | Type | Description |
|-------|------|-------------|
| `component` | Any | The value displayed as the banner. |
| `id`  | String | The ID of the banner, which can be used as a React "key". |
| `priority` | Number | The priority of the banner. |

#### Example

This can be used to supply the banners to the `GlobalBannerList` React component (which is done for you).

```js
import { GlobalBannerList } from 'ui/notify';

<GlobalBannerList
  banners={banners.list}
  subscribe={banners.onChange}
/>
```

## Use in functional tests

Functional tests are commonly used to verify that an action yielded a successful outcome. You can place a
`data-test-subj` attribute on the banner and use it to check if the banner exists inside of your functional test.
This acts as a proxy for verifying the successful outcome. Any unrecognized field will be added as a property of the
containing element.

```js
banners.add({
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
banners.add({
  component: (
    <EuiCallOut
      title="Look at me!"
      data-test-subj="my-tested-banner"
    />
  ),
});
```