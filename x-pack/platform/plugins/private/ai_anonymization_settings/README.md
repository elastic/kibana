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

## Default configuration

The value the `ai:anonymizationSettings` setting ships with. Masking is off (`maskingEnabled:
false`), so nothing is anonymized until a user turns it on. The enabled state of each rule only
says which rules take effect once masking is on: the built-in email, IPv4, IPv6 and host-name rules
are enabled, the account rule and the NER rule are not. `onFailure` is `block`. `ui_settings_docs.test.ts` in `@kbn/ai-anonymization-server` checks that this block matches the
code, so update it whenever a built-in pattern changes: paste the registered `value` from
`getAnonymizationUiSettings()` in `@kbn/ai-anonymization-server` (it is already a pretty-printed JSON string).

```json
{
  "maskingEnabled": false,
  "onFailure": "block",
  "rules": [
    {
      "id": "builtin-email",
      "name": "Email addresses",
      "entityClass": "EMAIL",
      "type": "RegExp",
      "pattern": "[\\w.%+'À-ſΑ-я-]{1,64}@(?:[A-Za-z0-9À-ſΑ-я](?:[A-Za-z0-9À-ſΑ-я-]{0,61}[A-Za-z0-9À-ſΑ-я])?\\.){1,8}[A-Za-zÀ-ſΑ-я]{2,24}",
      "enabled": true,
      "builtIn": true
    },
    {
      "id": "builtin-ipv4",
      "name": "IPv4 addresses",
      "entityClass": "IP",
      "type": "RegExp",
      "pattern": "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\\.[0-9]{1,3}){0,4}\\b",
      "enabled": true,
      "builtIn": true
    },
    {
      "id": "builtin-ipv6",
      "name": "IPv6 addresses",
      "entityClass": "IP",
      "type": "RegExp",
      "pattern": "(?:::(?:[0-9A-Fa-f]{1,4}:){0,5}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){1,6}:(?:[0-9A-Fa-f]{1,4}:){0,5}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){6}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4})|(?:[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6})|(?:(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5})|(?:(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4})|(?:(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3})|(?:(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2})|(?:(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4})|(?:(?:[0-9A-Fa-f]{1,4}:){1,7}:)|(?::(?::[0-9A-Fa-f]{1,4}){1,7})",
      "enabled": true,
      "builtIn": true
    },
    {
      "id": "builtin-host-name",
      "name": "Host and machine names",
      "entityClass": "HOST_NAME",
      "type": "RegExp",
      "pattern": "\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.){1,10}(?:[cC][oO][mM]|[nN][eE][tT]|[oO][rR][gG]|[iI][oO]|[cC][oO]|[eE][dD][uU]|[gG][oO][vV]|[mM][iI][lL]|[bB][iI][zZ]|[xX][yY][zZ])(?:(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?){0,8}\\.(?:[cC][lL][oO][uU][dD]|[dD][eE][vV]|[aA][pP][pP]|[aA][iI]|[iI][nN][tT]|[lL][oO][cC][aA][lL]|[iI][nN][tT][eE][rR][nN][aA][lL]|[cC][oO][rR][pP]|[lL][aA][nN]|[hH][oO][mM][eE]|[sS][vV][cC]|[cC][lL][uU][sS][tT][eE][rR]|[tT][eE][cC][hH]|[oO][nN][lL][iI][nN][eE]|[sS][iI][tT][eE]|[lL][iI][vV][eE]|[lL][iI][nN][kK]|[cC][lL][iI][cC][kK]|[wW][oO][rR][lL][dD]|[sS][yY][sS][tT][eE][mM][sS]|[sS][oO][lL][uU][tT][iI][oO][nN][sS]|[sS][eE][rR][vV][iI][cC][eE][sS]|[eE][uU]|[uU][sS]|[uU][kK]|[dD][eE]|[fF][rR]|[jJ][pP]|[cC][nN]|[rR][uU]|[nN][lL]|[sS][eE]|[dD][kK]|[fF][iI]|[cC][hH]|[nN][zZ]|[sS][gG]|[kK][rR]|[mM][xX]|[hH][kK]|[tT][wW]|[cC][aA]|[aA][uU]|[bB][rR]|[eE][sS]|[iI][tT]|[bB][eE]|[aA][tT]|[nN][oO]|[iI][eE]|[pP][tT]|[gG][rR]|[cC][zZ]|[hH][uU]|[rR][oO]|[bB][gG]|[sS][kK]|[sS][iI]|[hH][rR]|[rR][sS]|[uU][aA]|[tT][rR]|[iI][lL]|[iI][nN]|[pP][hH]|[tT][hH]|[vV][nN]|[pP][kK]|[bB][dD]|[aA][eE]|[sS][aA]|[zZ][aA]|[nN][gG]|[kK][eE]|[eE][gG]|[aA][rR]|[cC][lL]|[pP][eE]|[vV][eE]|[pP][lL]|[mM][eE]|[tT][vV]))?\\b|\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.){2,10}(?:[cC][lL][oO][uU][dD]|[dD][eE][vV]|[aA][pP][pP]|[aA][iI]|[iI][nN][tT]|[lL][oO][cC][aA][lL]|[iI][nN][tT][eE][rR][nN][aA][lL]|[cC][oO][rR][pP]|[lL][aA][nN]|[hH][oO][mM][eE]|[sS][vV][cC]|[cC][lL][uU][sS][tT][eE][rR]|[tT][eE][cC][hH]|[oO][nN][lL][iI][nN][eE]|[sS][iI][tT][eE]|[lL][iI][vV][eE]|[lL][iI][nN][kK]|[cC][lL][iI][cC][kK]|[wW][oO][rR][lL][dD]|[sS][yY][sS][tT][eE][mM][sS]|[sS][oO][lL][uU][tT][iI][oO][nN][sS]|[sS][eE][rR][vV][iI][cC][eE][sS]|[eE][uU]|[uU][sS]|[uU][kK]|[dD][eE]|[fF][rR]|[jJ][pP]|[cC][nN]|[rR][uU]|[nN][lL]|[sS][eE]|[dD][kK]|[fF][iI]|[cC][hH]|[nN][zZ]|[sS][gG]|[kK][rR]|[mM][xX]|[hH][kK]|[tT][wW]|[cC][aA]|[aA][uU]|[bB][rR]|[eE][sS]|[iI][tT]|[bB][eE]|[aA][tT]|[nN][oO]|[iI][eE]|[pP][tT]|[gG][rR]|[cC][zZ]|[hH][uU]|[rR][oO]|[bB][gG]|[sS][kK]|[sS][iI]|[hH][rR]|[rR][sS]|[uU][aA]|[tT][rR]|[iI][lL]|[iI][nN]|[pP][hH]|[tT][hH]|[vV][nN]|[pP][kK]|[bB][dD]|[aA][eE]|[sS][aA]|[zZ][aA]|[nN][gG]|[kK][eE]|[eE][gG]|[aA][rR]|[cC][lL]|[pP][eE]|[vV][eE]|[pP][lL]|[mM][eE]|[tT][vV])\\b",
      "enabled": true,
      "builtIn": true
    },
    {
      "id": "builtin-account-login",
      "name": "Account and login names",
      "entityClass": "USER_NAME",
      "type": "RegExp",
      "pattern": "\\b[A-Z][A-Z0-9-]{1,14}\\\\{1,16}(?:[A-Zac-eg-mo-qsw-z1-9][A-Za-z0-9._$-]{0,63}|[nrtbfuv0][a-z0-9][A-Za-z0-9._$-]{0,62})",
      "enabled": false,
      "builtIn": true
    },
    {
      "type": "NER",
      "modelId": "elastic__distilbert-base-uncased-finetuned-conll03-english",
      "enabled": false,
      "allowedEntityClasses": [
        "PER",
        "ORG",
        "LOC"
      ],
      "timeoutSeconds": 30
    }
  ]
}
```

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
  pattern or input can stall the regex worker. The page and the pattern tester's editor reject
  lookahead, lookbehind, backreferences and `\uXXXX` escapes for new patterns (write `\x{00e9}`);
  `(?i)`, `\p{L}` and similar are accepted. `\s` and `\w` are ASCII-only.
  **Rules saved earlier keep working.** Custom rules ran on native `RegExp` before RE2, so a stored
  rule that RE2 cannot compile falls back to the native engine instead of being skipped or failing
  every request. That fallback only keeps the protection those rules always had, the worker
  timeout; edit such a rule to RE2 syntax to remove the risk. The saved setting's schema does not
  check patterns either, on purpose: Core also validates the stored value on read and discards the
  whole setting (masking off) if one rule is invalid. A pattern invalid on both engines fails at
  run time and `onFailure` decides what happens.
- **Only a shipped built-in rule runs on the native engine by choice.** A rule counts as built-in
  when its id and pattern equal a shipped built-in; the `builtIn` flag alone does not, because the
  setting can be written through the API.
- **The account rule masks only the account name.** For `DOMAIN\account` the mask covers `account`;
  `DOMAIN\` and the backslashes stay visible. A masked value that contains backslashes does not
  round-trip: the matched text carries the escaping of the layer it was found in, and restoring it
  into a different layer (structured model output, tool arguments, JSON in JSON) changed the
  number of backslashes. The rule is off by default.
  Because only `DOMAIN\name` is matched, the same name written **bare** (for example a model
  repeating it in its own output, which a later request such as a migration fix loop then sends
  back) is not masked again: no built-in rule matches a bare user name.
- **Well-known public sites are not masked as host names.** There are two lists in
  `@kbn/ai-anonymization-common` (`builtin_match_filters.ts`). Services that are public by nature
  are left readable **with all their subdomains**: `github.com`, `githubusercontent.com`,
  `gitlab.com`, `stackoverflow.com`, `wikipedia.org`, `virustotal.com`, `owasp.org`, `ss64.com`.
  Websites of organisations are left readable **only as these exact hosts**, because the same
  organisation can be a customer with internal hosts under its domain: `attack.mitre.org`,
  `nvd.nist.gov`, `www.cisa.gov`, `learn.microsoft.com`, `docs.microsoft.com`,
  `www.microsoft.com`, `elastic.co`, `www.elastic.co`, `docs.elastic.co`. Everything else under
  those organisation domains (for example `corp.mitre.org`) is masked. Keep the lists short, and a
  test checks that every entry is listed here. Such filters apply to built-in rules only: a
  pattern cannot express them because it must also run on RE2, which has no lookbehind.
- **The pattern tester needs the `manage_advanced_settings` privilege** and runs on its own small
  worker pool with a short timeout, separate from the pool serving AI requests. It can be turned off
  with `xpack.aiAnonymizationSettings.patternTester.enabled: false` (default `true`), in which case
  the endpoint refuses requests and the management page hides the Pattern tester tab and the
  flyout's test button. A host plugin can also switch it off through the plugin's setup contract
  (`configurePatternTester({ enabled: false })`); the inference plugin does this when its
  anonymization workers are disabled (`xpack.inference.workers.anonymization.enabled: false`). The
  page cannot see that switch, so it still shows the tester and the endpoint refuses requests. A
  host can only restrict the tester, never re-enable it.
