## How to run tests

You can drop the following in your terminal.

```bash
run_tests() {
  local suit_name=$1
  local config_path=$2
  local run_mode=$3

  echo "--- $suit_name ($run_mode) UI Tests"
  if ! node scripts/scout run-tests "$run_mode" --config "$config_path"; then
    echo "$suit_name: failed"
  else
    echo "$suit_name: passed"
  fi
}

for run_mode in "--stateful" "--serverless=es" "--serverless=oblt" "--serverless=security"; do
  run_tests "Maps" "x-pack/platform/plugins/shared/maps/ui_tests/playwright.config.ts" "$run_mode"
done
```