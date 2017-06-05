#!/bin/sh
set -e

REMOVE_USER_AND_GROUP=false
REMOVE_DIRS=false

case $1 in
  # Includes cases for all valid arguments, exit 1 otherwise
  # Debian
  purge)
    REMOVE_USER_AND_GROUP=true
    REMOVE_DIRS=true
  ;;
  remove)
    REMOVE_DIRS=true
  ;;

  failed-upgrade|abort-install|abort-upgrade|disappear|upgrade|disappear)
  ;;

  # Red Hat
  0)
    REMOVE_USER_AND_GROUP=true
    REMOVE_DIRS=true
  ;;

  1)
  ;;

  *)
      echo "post remove script called with unknown argument \`$1'" >&2
      exit 1
  ;;
esac

if [ "$REMOVE_USER_AND_GROUP" = "true" ]; then
  if getent passwd "<%= user %>" >/dev/null; then
    userdel "<%= user %>"
  fi

  if getent group "<%= group %>" >/dev/null; then
    groupdel "<%= group %>"
  fi
fi

if [ "$REMOVE_DIRS" = "true" ]; then
  if [ -d "<%= optimizeDir %>" ]; then
    rm -rf "<%= optimizeDir %>"
  fi

  if [ -d "<%= pluginsDir %>" ]; then
    rm -rf "<%= pluginsDir %>"
  fi

  if [ -d "<%= configDir %>" ]; then
    rmdir --ignore-fail-on-non-empty "<%= configDir %>"
  fi

  if [ -d "<%= dataDir %>" ]; then
    rmdir --ignore-fail-on-non-empty "<%= dataDir %>"
  fi
fi
