A set of scripts for developers to utilize command line functionality of Kibana/Elastic
search which is not available in the DEV console for the detection engine.

Before beginning ensure in your .zshrc/.bashrc you have your user, password, and url set:

Open up your .zshrc/.bashrc and add these lines with the variables filled in:
```
export ELASTICSEARCH_USERNAME=${user}
export ELASTICSEARCH_PASSWORD=${password}
export ELASTICSEARCH_URL=https://${ip}:9200
export KIBANA_URL=http://localhost:5601
export SIGNALS_INDEX=.siem-signals-${your user id}
export TASK_MANAGER_INDEX=.kibana-task-manager-${your user id}
export KIBANA_INDEX=.kibana-${your user id}

# This is for the kbn-action and kbn-alert tool
export KBN_URLBASE=http://${user}:${password}@localhost:5601
```

And that you have the latest version of [NodeJS](https://nodejs.org/en/),
[CURL](https://curl.haxx.se), and [jq](https://stedolan.github.io/jq/) installed.

If you have homebrew you can install using brew like so
```
brew install jq
```

After that you can execute scripts within this folder by first ensuring
your current working directory is `./scripts` and then running any scripts within
that folder.

Example to add a signal to the system

```
cd ./scripts
./post_signal.sh ./signals/root_or_admin_1.json
```

