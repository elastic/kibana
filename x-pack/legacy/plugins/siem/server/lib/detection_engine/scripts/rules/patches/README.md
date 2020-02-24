These are example PATCH rules to see how to patch various parts of the rules.
You either have to use the id, or you have to use the rule_id in order to patch
the rules. rule_id acts as an external_id where you can patch rules across different
Kibana systems where id acts as a normal server generated id which is not normally shared
across different Kibana systems.

The only thing you cannot patch is the `rule_id` or regular `id` of the system. If `rule_id`
is incorrect then you have to delete the rule completely and re-initialize it with the
correct `rule_id`

First add all the examples from queries like so:

```sh
./post_rule.sh ./rules/queries/*.json
```

Then to selectively patch a rule add the file of your choosing to patch:

```sh
./patch_rule.sh ./rules/patches/<filename>.json
```

Take note that the ones with "id" must be changed to a GUID that only you know about through
a `./find_rules.sh`. For example to grab a GUID id off of the first found record that exists
you can do: `./find_rules.sh | jq '.data[0].id'` and then replace the id in `patches/simplest_update_risk_score_by_id.json` with that particular id to watch it happen.
