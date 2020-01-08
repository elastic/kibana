These are example PUT rules to see how to update various parts of the rules.
You either have to use the id, or you have to use the rule_id in order to update
the rules. rule_id acts as an external_id where you can update rules across different
Kibana systems where id acts as a normal server generated id which is not normally shared
across different Kibana systems.

The only thing you cannot update is the `rule_id` or regular `id` of the system. If `rule_id`
is incorrect then you have to delete the rule completely and re-initialize it with the
correct `rule_id`

First add all the examples from queries like so:

```sh
./post_rule.sh ./rules/queries/*.json
```

Then to selectively update a rule add the file of your choosing to update:

```sh
./update_rule.sh ./rules/updates/<filename>.json
```

Take note that the ones with "id" must be changed to a GUID that only you know about through
a `./find_rules.sh`. For example to grab a GUID id off of the first found record that exists
you can do: `./find_rules.sh | jq '.data[0].id'` and then replace the id in `updates/simplest_update_risk_score_by_id.json` with that particular id to watch it happen.
