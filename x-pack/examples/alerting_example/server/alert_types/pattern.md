# rule type `example.pattern`

This rule type will generate alerts on a pattern.  The rule parameter
is `patterns`, and should be an `Record<string, string>` where the
key is the instance name, and the value is a string of tokens, either
`a` or `-`, used to indicate if the alert should be active or not.

The patterns progress through each step, and then cycle around to the
beginning when they get to the end.

For example, the parameter below will generate alerts on the following
runs, with the cycle repeating at run 7.

    {
      patterns: {
        instA: ' a - a ',
        instB: ' - a ',
      },
    }

| run  | instA  | instB  |
| ---- | ------ | ------ |
|    1 | active |        |
|    2 |        | active |
|    3 | active |        |
|    4 | active | active |
|    5 |        |        |
|    6 | active | active |
|    7 | active |        |

The context variables available are:

- `patternIndex` - index of the pattern being run
- `action` - either 'a' or '-' for the current pattern action, so 'a' :-)
- `pattern` - the entire pattern, as an array of 'a' and '-' chars
- `runs` - total number of runs of the rule

There is no UX for this (yet), so you'll need to use `curl` to create/update
the rule.  The following also uses [`jq`](https://stedolan.github.io/jq/) 
to create a connector and capture it's id to use with the rule.

```console
SERVER_LOG_ID=`curl $KBN_URL/api/actions/connector -H "kbn-xsrf: foo" -H "content-type: application/json" -d '{
  "connector_type_id": ".server-log",
  "name": "server log",
  "config": {},
  "secrets": {}
}' |  jq -r '.id'`


curl $KBN_URL/api/alerting/rule/ -H "kbn-xsrf: foo" -H "content-type: application/json" -d "{
  \"rule_type_id\": \"example.pattern\",
  \"name\": \"pattern\",
  \"schedule\": {
    \"interval\": \"5s\"
  },
  \"actions\": [
    { \"group\": \"default\", \"id\": \"$SERVER_LOG_ID\", \"params\": { \"message\": \"{{alert.id}} active on run {{context.runs}} step {{context.patternIndex}}\"}}
  ],
  \"consumer\": \"alerts\",
  \"tags\": [],
  \"notify_when\": \"onActiveAlert\",
  \"params\": {
    \"patterns\": {
      \"instA\": \" a - a \",
      \"instB\": \" - a \"
    }
  }
}"
```
