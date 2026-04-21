#!/bin/bash

set -e

# Run from this script's directory so .nvmrc and Yarn use the Kibana repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Kibana pins an exact Node version; Yarn refuses to run if it does not match.
REQUIRED_NODE="$(tr -d '[:space:]' < .nvmrc)"
CURRENT_NODE="$(node -p "process.versions.node" 2>/dev/null || true)"

ensure_node() {
  if [ "$CURRENT_NODE" = "$REQUIRED_NODE" ]; then
    echo ">>> Using Node ${CURRENT_NODE} (matches .nvmrc)"
    return 0
  fi

  # Prefer nvm (common on macOS dev machines)
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    nvm install "$REQUIRED_NODE"
    nvm use "$REQUIRED_NODE"
    CURRENT_NODE="$(node -p "process.versions.node")"
    echo ">>> Switched to Node ${CURRENT_NODE} via nvm"
    return 0
  fi

  # fnm
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env)"
    fnm install "$REQUIRED_NODE"
    fnm use "$REQUIRED_NODE"
    CURRENT_NODE="$(node -p "process.versions.node")"
    echo ">>> Switched to Node ${CURRENT_NODE} via fnm"
    return 0
  fi

  # asdf-vm (shell only — does not add a .tool-versions file to the repo)
  if command -v asdf >/dev/null 2>&1; then
    asdf install nodejs "$REQUIRED_NODE" 2>/dev/null || true
    asdf shell nodejs "$REQUIRED_NODE"
    CURRENT_NODE="$(node -p "process.versions.node")"
    echo ">>> Switched to Node ${CURRENT_NODE} via asdf"
    return 0
  fi

  echo "error: Kibana needs Node ${REQUIRED_NODE} (see .nvmrc). Active: ${CURRENT_NODE:-none}"
  echo "Install nvm (https://github.com/nvm-sh/nvm), then: cd \"$SCRIPT_DIR\" && nvm install && nvm use"
  exit 1
}

ensure_node

# Print KS ASCII art and "Kibana Starter" below
cat << "EOF"
 _  __  ____  
| |/ / / ___| 
| ' /  \___ \ 
| . \   ___) |
|_|\_\ |____/ 

Kibana Starter
EOF

echo ""
echo ">>> Starting Kibana setup..."



# Step 1: Install dependencies
yarn

# Step 2: Bootstrap the Kibana repo
yarn kbn bootstrap

# Step 3: Pull latest changes
git pull

# Step 4: Open a new Terminal tab and run 'yarn es snapshot'
# New Terminal sessions do not load nvm/fnm — prepend the same Node bin dir we use here.
NODE_BIN_DIR="$(dirname "$(command -v node)")"
osascript <<EOF
tell application "Terminal"
    do script "cd \"$SCRIPT_DIR\"; export PATH=\"$NODE_BIN_DIR:\$PATH\"; yarn es snapshot"
end tell
EOF

# Optional: Wait a bit to let Elasticsearch start up (adjust as needed)
echo "Waiting for Elasticsearch to start..."
sleep 30

# Step 5: Start Kibana in the current terminal
yarn start
