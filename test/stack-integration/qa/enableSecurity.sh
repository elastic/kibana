#!/bin/bash
echo test >> /c/vagrant/qa/temp.text
set -e

# cd to the qa/ dir where this script lives
cd "$( dirname "${BASH_SOURCE[0]}" )"
QADIR=$PWD

. ./envvars.sh


# if we installed a config without security enabled and now want to enable it
# we need to set a password for the kibana user, logstash user, and create a bunch
# of other users for beats, etc.

# The problem I still have is that I  *think* I couldn't have the elasticsearch.username and
# elasticsearch.password params in the Kibana.yml if security wasn't enabled?
# That means I have to add them and restart?  Or use the keystore?

curl -k -XPUT --basic "$ESURL/_xpack/security/user/kibana/_password?pretty" -H 'Content-Type: application/json' -d'
{ "password": "changeit" }'> /tmp/tempcurl 2>&1
cat /tmp/tempcurl

curl -k -XPUT --basic "$ESURL/_xpack/security/user/logstash_system/_password?pretty" -H 'Content-Type: application/json' -d'
{ "password": "changeit" }'> /tmp/tempcurl 2>&1
cat /tmp/tempcurl


echo -e "\n-- `date` Create all users and roles"
cat users_roles.txt | while read line; do ./create_roles_users.sh $ESURL $line; done
