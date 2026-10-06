# AI Anonymization Settings Plugin

This plugin provides a dedicated Stack Management page (sibling to **GenAI Settings**) for configuring the
regex-based anonymization rules (`ai:anonymizationSettings`) used by the inference plugin's `chatComplete`
anonymization pipeline. It is available to every Kibana offering.

The page has four tabs:

- **Built-in patterns**: Elastic-maintained regex rules (email, IPv4, host/machine names, account and login
  names). Each can be individually enabled/disabled; their patterns are not editable from the UI.
- **Custom patterns**: user-authored regex rules, added/edited via a flyout (name, entity type, pattern,
  enabled).
- **Pattern tester**: runs the currently-enabled rules against sample or user-provided JSON via a
  non-persisting backend endpoint, and shows what was masked before content would be sent to a model.
- **Settings**: the master "Mask PII in AI requests" switch (mirrored in the page header) and the
  `onFailure` behavior (`block` vs `allow_unsafe`) used when anonymization cannot run.

Named-entity-recognition (NER) rule support still exists in the underlying schema and pipeline
(`@kbn/ai-anonymization-server`) but is intentionally not surfaced anywhere on
this page.

## Limitations

- **Masks are pseudonyms, not encryption.** Without the per-space salt (not available in this mode),
  a mask is `<ENTITY>_<SHA-1 of the original value>`. Values from a small space (an IPv4 range, a
  list of usernames or host names) can be recovered from the mask by guessing. Do not describe the
  masks as irreversible.
- **Built-in patterns are written to run the same on native `RegExp` and on RE2.** Do not add
  lookahead, lookbehind, backreferences or unbounded quantifiers to them;
  `default_builtin_regex_rules.test.ts` in `@kbn/ai-anonymization-common` fails if a rule behaves differently on the two engines or is
  slow on long inputs.
- **Not covered by the built-ins:** email addresses in scripts other than Latin, Greek and Cyrillic
  (CJK, Arabic, Hebrew, ...), IPv6 addresses, and bare single-label host names (`server01`,
  `nas.local`). Four-part version numbers (`3.11.4.2`) are indistinguishable from IPv4 addresses and
  are masked.
- **The pattern tester needs the `manage_advanced_settings` privilege** and runs on its own small
  worker pool with a short timeout, separate from the pool serving AI requests. It can be turned off
  with `xpack.aiAnonymizationSettings.patternTester.enabled: false` (default `true`), in which case
  the endpoint refuses requests.
