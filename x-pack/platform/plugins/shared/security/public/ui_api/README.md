# Service-account picker

The Security plugin exposes a lazy picker through its public start contract. Products can reuse
account names, descriptions, role badges, permission states, management navigation, and account
creation without importing Security's implementation or building a directory client.

```tsx
const picker = security.uiApi.components.getServiceAccountPicker({
  selectedId,
  onSelect: (account) => {
    setSelectedId(account?.id);
    setIsOpen(false);
  },
  onClose: () => setIsOpen(false),
});
```

Render the returned element inside the product's popover or panel. The host controls opening and
closing. `search` optionally filters loaded accounts by name, ID, or description; the picker offers
pagination when more accounts exist. Selection returns a directory entry with the stable `id`, not
just its display name.

The picker uses the current user's directory endpoint, hides disabled/unassumable accounts, and
renders nothing when service accounts are disabled. Manage and Create account follow the user's
capabilities. Creation reuses `getCreateServiceAccount`'s flyout implementation and selects the newly
created account. Products must still authorize and persist their workload binding on the server;
a picker selection does not grant permission to execute as that account.

`allowCurrentUser` pins a "Current user" option first. It stays available while accounts load or
when the user cannot list them, appears selected when `selectedId` is empty, and calls `onSelect`
with `null`. The host decides what running as the current user means for its workload.

Hosts that already own a directory (such as Monaco completion providers) can supply `directory`
with accounts, loading/access/error state, pagination, and retry callbacks. This prevents duplicate
requests. `activeIndex` and `onActiveIndexChange` allow host-controlled keyboard navigation.

`onCreate` optionally overrides the default creation action. A host that uses this option owns the
flyout, directory refresh, and selection callback. Workflows uses it to capture the editor model and
version before opening the shared creation flyout, so a late response cannot overwrite another draft.
