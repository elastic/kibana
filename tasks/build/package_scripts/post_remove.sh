#!/bin/sh
set -e

user_check() {
  getent passwd "$1" > /dev/null 2>&1
}

user_remove() {
  userdel "$1"
}

REMOVE_USER=false
REMOVE_DIRS=false

case $1 in
  # Includes cases for all valid arguments, exit 1 otherwise
  # Debian
  purge)
    REMOVE_USER=true
    REMOVE_DIRS=true
  ;;
  remove)
    REMOVE_DIRS=true
  ;;

  failed-upgrade|abort-install|abort-upgrade|disappear|upgrade|disappear)
  ;;

  # Red Hat
  0)
    REMOVE_USER=true
    REMOVE_DIRS=true
  ;;

  1)
  ;;

  *)
      echo "post remove script called with unknown argument \`$1'" >&2
      exit 1
  ;;
esac

if [ "$REMOVE_USER" = "true" ]; then
  if user_check "<%= user %>"  ; then
    user_remove "<%= user %>"
  fi
fi

if [ "$REMOVE_DIRS" = "true" ]; then
  if [ -d "<%= optimizeDir %>" ]; then
    rm -rf "<%= optimizeDir %>"
  fi

  if [ -d "<%= pluginsDir %>" ]; then
    rm -rf "<%= pluginsDir %>"
  fi

  if [ -d "<%= dataDir %>" ]; then
    rmdir --ignore-fail-on-non-empty "<%= dataDir %>"
  fi
fi
