## How to run tests

You can drop the following in your terminal.

```bash
run_tests() {
  local suit_name=$1
  local config_path=$2
  local arch=$3
  local domain=$4

  echo "--- $suit_name ($run_mode) UI Tests"
  if ! node scripts/scout run-tests --arch $arch --domain $domain --config "$config_path"; then
    echo "$suit_name: failed"
  else
    echo "$suit_name: passed"
  fi
}

run_tests "Maps" "x-pack/platform/plugins/shared/maps/test/scout/ui/playwright.config.ts" "stateful" "classic"

for domain in "search observability_complete security_complete"; do
  run_tests "Maps" "x-pack/platform/plugins/shared/maps/test/scout/ui/playwright.config.ts" "serverless" "$domain"
done
```
