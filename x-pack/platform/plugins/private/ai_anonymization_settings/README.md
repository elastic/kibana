# AI Anonymization Settings Plugin

This plugin provides a dedicated Stack Management page (sibling to **GenAI Settings**) for configuring the
regex-based anonymization rules (`ai:anonymizationSettings`) used by the inference plugin's `chatComplete`
anonymization pipeline. It is available to every Kibana offering, and requires an Enterprise license like the other
AI features: below it the page is not listed in Stack Management and the pattern tester endpoint
returns a 403. The page is also not listed where connectors are not available (the same
capability check as GenAI Settings), as in some serverless tiers.

The page has four tabs:

- **Built-in patterns**: Elastic-maintained regex rules (email, IPv4, host/machine names, account and login
  names). Each can be individually enabled/disabled; their patterns are not editable from the UI.
- **Custom patterns**: user-authored regex rules, added/edited via a flyout (name, entity type, pattern,
  enabled).
- **Pattern tester**: runs the currently-enabled rules against sample or user-provided JSON via a
  non-persisting backend endpoint, and shows what was masked before content would be sent to a model.
- **Settings**: the master "Mask PII in AI requests" switch (mirrored in the page header) and the
  `onFailure` behavior (`block` vs `allow_unsafe`) used when anonymization cannot run.

The setting itself is no longer listed in **Advanced Settings** (it is registered `readonly` with
`readonlyMode: 'ui'`, like the GenAI settings): this page is the place to edit it. It can still be
written through the API and set with `uiSettings.overrides` in `kibana.yml`.

Named-entity-recognition (NER) rule support still exists in the underlying schema and pipeline
(`@kbn/ai-anonymization-server`) but is intentionally not surfaced anywhere on
this page.

## Access

The page is offered only to users who can change what it shows, so a user who cannot use it gets
no Stack Management entry for it. That takes all of:

- Advanced Settings **All** (`advancedSettings.save`; the pattern tester endpoint also needs
  `manage_advanced_settings`),
- the Connectors privilege (`actions.show` and `actions.execute`),
- an Enterprise license.

This is stricter than **GenAI Settings**, which is offered with the Connectors privilege alone and
disables its controls for users who cannot save. The difference is intentional.

## Limitations

- **Masks are pseudonyms, not encryption.** Without the per-space salt (not available in this mode),
  a mask is `<ENTITY>_<SHA-1 of the original value>`. Values from a small space (an IPv4 range, a
  list of usernames or host names) can be recovered from the mask by guessing. Do not describe the
  masks as irreversible.
- **Custom patterns use RE2 syntax** (`re2js`), not JavaScript's. They match in linear time, so no
  pattern or input can stall the regex worker. Lookahead, lookbehind, backreferences and `\uXXXX`
  escapes are rejected (write `\x{00e9}`); `(?i)`, `\p{L}` and similar are accepted. `\s` and `\w`
  are ASCII-only. The page and the pattern tester enforce this. The saved setting's schema does
  not, on purpose: Core also validates the stored value on read and discards the whole setting
  (masking off) if one rule is invalid, so a rule written through the API that RE2 cannot compile
  fails at run time instead, and `onFailure` decides what happens.
- **`onFailure: 'allow_unsafe'` is graded, not all-or-nothing.** A custom rule that does not
  compile is skipped on its own. If the regex stage fails to run (timeout, crashed worker), the
  request is retried with the built-in rules only; it is sent unmasked only if that fails too. With
  `block` (default) any of these fails the request.
- **Built-in patterns are written to run the same on native `RegExp` and on RE2.** Do not add
  lookahead, lookbehind, backreferences or unbounded quantifiers to them;
  `default_builtin_regex_rules.test.ts` in `@kbn/ai-anonymization-common` fails if a rule behaves differently on the two engines or is
  slow on long inputs.
- **Not covered by the built-ins:** email addresses in scripts other than Latin, Greek and Cyrillic
  (CJK, Arabic, Hebrew, ...) and bare single-label host names (`server01`, `nas.local`). Four-part version numbers (`3.11.4.2`) are indistinguishable from IPv4 addresses and
  are masked.
- **The account rule masks only the account name.** For `DOMAIN\account` the mask covers `account`;
  `DOMAIN\` and the backslashes stay visible. A masked value that contains backslashes does not
  round-trip: the matched text carries the escaping of the layer it was found in, and restoring it
  into a different layer (structured model output, tool arguments, JSON in JSON) changed the
  number of backslashes. The rule is off by default.
- **Well-known public sites are not masked as host names** (`github.com`, `mitre.org`, `nist.gov`,
  `cisa.gov`, `owasp.org`, `virustotal.com`, `microsoft.com`, `ss64.com`, ... and their
  subdomains). The list is `PUBLIC_DOMAINS` in `@kbn/ai-anonymization-common`
  (`builtin_match_filters.ts`); keep it short, because a customer's own domain on it would never be
  masked. Such filters apply to built-in rules only: a pattern cannot express them because it must
  also run on RE2, which has no lookbehind.
- **The pattern tester needs the `manage_advanced_settings` privilege** and runs on its own small
  worker pool with a short timeout, separate from the pool serving AI requests. It can be turned off
  with `xpack.aiAnonymizationSettings.patternTester.enabled: false` (default `true`), in which case
  the endpoint refuses requests and the management page hides the Pattern tester tab and the
  flyout's test button. A host plugin can also switch it off through the plugin's setup contract
  (`configurePatternTester({ enabled: false })`); the inference plugin does this when its
  anonymization workers are disabled (`xpack.inference.workers.anonymization.enabled: false`). The
  page cannot see that switch, so it still shows the tester and the endpoint refuses requests. A
  host can only restrict the tester, never re-enable it.
