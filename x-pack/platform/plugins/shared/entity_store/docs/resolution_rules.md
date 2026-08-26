# Out-of-the-box entity resolution rules

These rules run automatically in the `automated-resolution` maintainer. They are enabled by default wherever the matching data sources are ingested. Disable a rule with `PUT /api/security/entity_store/resolution/rules/{id}/disable` if it produces unwanted links in your environment. Re-enable with the matching `/enable` route. Listing rules (`GET /api/security/entity_store/resolution/rules`) returns each rule's description and enabled state.

| Id | What it bridges | Data sources | When to disable |
|---|---|---|---|
| `email_exact_match` | The same person's user entities that share an email address, compared case-insensitively | Any source that populates `user.email` | Shared mailboxes or role accounts create false links |
| `windows_sid_bridge` | Windows / system logon entities ↔ Active Directory by SID (`user.id`), excluding well-known SIDs (`S-1-5-18/19/20` and built-in aliases `S-1-5-32-544`–`554`) | Windows or system IAM events plus Active Directory entity analytics | Well-known SID exclusions are not enough, or Windows events should stay unmerged |
| `entra_guid_bridge` | Microsoft Defender identities ↔ Entra ID by GUID-shaped `user.id` | Defender identity events (`m365_defender`) plus Entra entity analytics | Defender SID logon events leak through the GUID gate |
| `crowdstrike_sid_bridge` | CrowdStrike user entities ↔ Active Directory by SID-prefixed `user.id` (Linux UIDs are ignored) | CrowdStrike FDR IAM events plus Active Directory entity analytics | CrowdStrike SID coverage is noisy in the tenant |
| `upn_cross_field_bridge` | Microsoft 365 audit actors (`user.id` UPN) ↔ Entra users (`user.name` UPN), compared case-insensitively | o365 audit user-lifecycle operations plus Entra entity analytics | The admin-actor population should stay as a separate entity |
| `related_user_alias_resolution` | Related-user aliases from identity-provider source documents | Entity analytics related.user fields | Default-disabled; enable only after validating on live data |

Rules are namespace-gated: a deployment that does not ingest the listed integrations produces no links from that rule. `related_user_alias_resolution` stays on Query DSL; every other rule above uses the shared ES|QL matcher.
