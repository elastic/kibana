#!/bin/bash

if [ -z "$NATIVEKIBANAUSER" ]; then . ./envvars.sh; fi

# Map most of the built-in roles to oidc1 groups.
for ROLE_NAME in kibana_user logstash_reader apm_reader beats_reader farequote_reader ingest_admin machine_learning_admin machine_learning_user monitoring_user reporting_user security_manager watcher_admin watcher_user; do (

  JSON="{ \"roles\": [ \"$ROLE_NAME\" ], \"enabled\": true, \"rules\": { \"all\": [ {\"field\" : { \"realm.name\" : \"oidc1\" }}, {\"field\" : { \"groups\" : [\"$ROLE_NAME\"] }} ] }}"

  curl -k -POST $ESURL/_xpack/security/role_mapping/$ROLE_NAME -H 'Content-Type: application/json' -d "$JSON" > /tmp/tempcurl 2>&1

  echo -e "$ROLE_NAME `cat /tmp/tempcurl`\n"
); done

# the OIDC superuser has a group of "SHIELD" so we need to map that one to the superuser role
curl -k -XPOST $ESURL/_xpack/security/role_mapping/oidc -H 'Content-Type: application/json' -d'
{

  "roles": [ "superuser" ],
  "enabled": true,
  "rules":
 {
    "all": [
       {"field" : { "realm.name" : "oidc1" }},
       {"field" : { "groups" : ["SHIELD"] }}
    ]
  }
}
'
