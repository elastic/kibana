## Summary

When a user confirms conversation deletion in the Agent Builder sidebar, the modal closes immediately and the conversation row stays visible with a spinner until the server responds. Once deletion is confirmed, the row disappears.

**Changes:**
- Modal closes immediately on confirm (no waiting)
- Row stays in the list with a spinner and dimmed appearance while deleting
- Clicking the row link is disabled during deletion
- On error, the row returns to normal so the user can retry

---

### Checklist

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This was checked for breaking HTTP API changes, and any breaking changes have been approved by the breaking-change committee. The `release_note:breaking` label should be applied in these situations.
- [ ] [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) was used on any tests changed
- [ ] The PR description includes the appropriate Release Notes section, and the correct `release_note:*` label is applied per the [guidelines](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
- [ ] Review the [backport guidelines](https://docs.google.com/document/d/1VyN5k91e5OVumlc0Gb9RPa3h1ewuPE705nRtioPiTvY/edit?usp=sharing) and apply applicable `backport:*` labels.

---

### Test plan

- [ ] Click "Delete" in the modal — modal closes immediately, row shows spinner
- [ ] Row disappears once the server confirms deletion
- [ ] Clicking the dimmed row link during deletion does nothing
- [ ] On network error, row returns to normal and can be deleted again
- [ ] Other rows remain interactive while one is being deleted
- [ ] Works the same in both the CHATS and PINNED sections

---

### Release Notes

The conversation delete confirmation modal now closes immediately, and the row shows a loading spinner in the sidebar until the server confirms deletion.
